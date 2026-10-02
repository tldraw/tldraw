import { atom, computed, react, transact, unsafe__withoutCapture } from '@tldraw/state'
import {
	CameraRecordType,
	TLCamera,
	TLINSTANCE_ID,
	TLInstancePresence,
	TLUserId,
} from '@tldraw/tlschema'
import { bind, compact, last, lerp, structuredClone } from '@tldraw/utils'
import {
	DEFAULT_ANIMATION_OPTIONS,
	DEFAULT_CAMERA_OPTIONS,
	FRAME_MS_60HZ,
	INTERNAL_POINTER_IDS,
} from '../../../constants'
import { Box, BoxLike } from '../../../primitives/Box'
import { EASINGS } from '../../../primitives/easings'
import { approximately, clamp } from '../../../primitives/utils'
import { Vec, VecLike } from '../../../primitives/Vec'
import type { Editor } from '../../Editor'
import {
	clampCameraZoom,
	constrainCamera,
	getCameraZoomedAboutPoint,
	getFitZoom,
	getNextZoomStep,
} from '../../kernels/camera'
import { TLCameraConstraints, TLCameraMoveOptions, TLCameraOptions } from '../../types/misc-types'
import { EditorManager } from '../EditorManager'

/**
 * The camera: options and constraints, zoom, animation, viewport bounds, coordinate conversion and following another user.
 *
 * @internal
 */
export class CameraManager extends EditorManager {
	/* --------------------- Camera --------------------- */

	/** @internal */
	@computed
	_unsafe_getCameraId() {
		return CameraRecordType.createId(this.editor.getCurrentPageId())
	}

	@computed getCamera(): TLCamera {
		const baseCamera = this.editor.store.get(this._unsafe_getCameraId())!
		if (this._isLockedOnFollowingUser.get()) {
			const followingCamera = this.getCameraForFollowing()
			if (followingCamera) {
				return { ...baseCamera, ...followingCamera }
			}
		}
		return baseCamera
	}

	_getFollowingPresence(targetUserId: TLUserId | null) {
		const visited = [this.editor.user.getRecordId()]
		const collaborators = this.editor.getCollaborators()
		let leaderPresence = null as null | TLInstancePresence
		while (targetUserId && !visited.includes(targetUserId)) {
			const nextPresence = collaborators.find((c) => c.userId === targetUserId)
			// Stop at the last resolvable presence, otherwise a leader whose own leader has left
			// (or whose presence hasn't arrived yet) can't be followed at all
			if (!nextPresence) break
			leaderPresence = nextPresence
			targetUserId = nextPresence.followingUserId ?? null
			visited.push(nextPresence.userId)
		}
		return leaderPresence
	}

	@computed
	getViewportPageBoundsForFollowing(): null | Box {
		const leaderPresence = this._getFollowingPresence(
			this.editor.getInstanceState().followingUserId
		)

		if (!leaderPresence?.camera || !leaderPresence?.screenBounds) return null

		// Fit their viewport inside of our screen bounds
		// 1. calculate their viewport in page space
		const { w: lw, h: lh } = leaderPresence.screenBounds
		const { x: lx, y: ly, z: lz } = leaderPresence.camera
		const theirViewport = new Box(-lx, -ly, lw / lz, lh / lz)

		// resize our screenBounds to contain their viewport
		const ourViewport = this.editor.getViewportScreenBounds().clone()
		const ourAspectRatio = ourViewport.width / ourViewport.height

		ourViewport.width = theirViewport.width
		ourViewport.height = ourViewport.width / ourAspectRatio
		if (ourViewport.height < theirViewport.height) {
			ourViewport.height = theirViewport.height
			ourViewport.width = ourViewport.height * ourAspectRatio
		}

		ourViewport.center = theirViewport.center
		return ourViewport
	}

	@computed
	getCameraForFollowing(): null | { x: number; y: number; z: number } {
		const viewport = this.getViewportPageBoundsForFollowing()
		if (!viewport) return null

		return {
			x: -viewport.x,
			y: -viewport.y,
			z: this.editor.getViewportScreenBounds().w / viewport.width,
		}
	}

	@computed getZoomLevel() {
		return this.editor.getCamera().z
	}

	@computed getResizeScaleFactor() {
		return this.editor.user.getIsDynamicResizeMode() ? 1 / this.editor.getZoomLevel() : 1
	}

	_debouncedZoomLevel = atom('debounced zoom level', 1)

	@computed getDebouncedZoomLevel() {
		if (this.editor.options.debouncedZoom) {
			if (this.editor.getCameraState() === 'idle') {
				return this.editor.getZoomLevel()
			} else {
				return this._debouncedZoomLevel.get()
			}
		}

		return this.editor.getZoomLevel()
	}

	@computed _getAboveDebouncedZoomThreshold() {
		return this.editor.getCurrentPageShapeIds().size > this.editor.options.debouncedZoomThreshold
	}

	@computed getEfficientZoomLevel() {
		return this._getAboveDebouncedZoomThreshold()
			? this.editor.getDebouncedZoomLevel()
			: this.editor.getZoomLevel()
	}

	getInitialZoom() {
		return this._getFitZoom(this.editor.getCameraOptions().constraints?.initialZoom ?? 'default')
	}

	getBaseZoom() {
		return this._getFitZoom(this.editor.getCameraOptions().constraints?.baseZoom ?? 'default')
	}

	_getFitZoom(fit: TLCameraConstraints['initialZoom']): number {
		const { constraints } = this.editor.getCameraOptions()
		if (!constraints || fit === 'default') return 1
		return getFitZoom(fit, constraints, this.editor.getViewportScreenBounds())
	}

	_cameraOptions = atom('camera options', DEFAULT_CAMERA_OPTIONS)

	getCameraOptions() {
		return this._cameraOptions.get()
	}

	setCameraOptions(opts: Partial<TLCameraOptions>) {
		const next = structuredClone({
			...this._cameraOptions.__unsafe__getWithoutCapture(),
			...opts,
		})
		// `undefined < 1` is false, so an explicit `zoomSteps: undefined` would otherwise get through
		// and make every later camera move throw
		if (!next.zoomSteps || next.zoomSteps.length < 1) next.zoomSteps = [1]
		this._cameraOptions.set(next)
		this.editor.setCamera(this.editor.getCamera())
		return this.editor
	}

	getConstrainedCamera(
		point: VecLike,
		opts?: TLCameraMoveOptions
	): {
		x: number
		y: number
		z: number
	} {
		const current = this.editor.getCamera()
		const requested = { x: point.x, y: point.y, z: point.z === undefined ? current.z : point.z }

		// If force is true, then we'll set the camera to the point regardless of
		// the camera options, so that we can handle gestures that permit elasticity
		// or decay, or animations that occur while the camera is locked.
		if (opts?.force) return requested

		// Reads stay in this order, and each only on the branch that needs it, so subclass overrides
		// and reactive dependencies see the same calls as before (see cameraConstraintReads.test.ts).
		const { zoomSteps, constraints } = this.editor.getCameraOptions()
		const viewport = this.editor.getViewportScreenBounds()
		if (!constraints) return clampCameraZoom(current, requested, zoomSteps)

		return constrainCamera({
			current,
			requested,
			zoomSteps,
			constraints,
			viewport,
			baseZoom: this.editor.getBaseZoom(),
			resetZoom: opts?.reset ? this.editor.getInitialZoom() : null,
		})
	}

	/** @internal */
	_setCamera(point: VecLike, opts?: TLCameraMoveOptions): Editor {
		const currentCamera = this.editor.getCamera()

		const { x, y, z } = this.editor.getConstrainedCamera(point, opts)

		if (currentCamera.x === x && currentCamera.y === y && currentCamera.z === z) {
			return this.editor
		}

		transact(() => {
			const camera = { ...currentCamera, x, y, z }
			this.editor.run(
				() => {
					this.editor.store.put([camera]) // include id and meta here
				},
				{ history: 'ignore' }
			)

			// Dispatch a new pointer move because the pointer's page will have changed
			// (its screen position will compute to a new page position given the new camera position)
			const currentScreenPoint = this.editor.inputs.getCurrentScreenPoint()
			const currentPagePoint = this.editor.inputs.getCurrentPagePoint()

			// compare the next page point (derived from the current camera) to the current page point
			if (
				currentScreenPoint.x / z - x !== currentPagePoint.x ||
				currentScreenPoint.y / z - y !== currentPagePoint.y
			) {
				// If it's changed, dispatch a pointer event
				this.editor.updatePointer({
					immediate: opts?.immediate,
					pointerId: INTERNAL_POINTER_IDS.CAMERA_MOVE,
				})
			}

			this._tickCameraState()
		})

		return this.editor
	}

	setCamera(point: VecLike, opts?: TLCameraMoveOptions): Editor {
		const { isLocked } = this._cameraOptions.__unsafe__getWithoutCapture()
		if (isLocked && !opts?.force) return this.editor

		// Resolve the zoom before building the Vec: Vec.Cast would default a missing z to 1,
		// and a missing z should keep the current zoom level instead
		const _point = new Vec(point.x, point.y, point.z ?? this.editor.getZoomLevel())

		// Reject non-finite values before anything else, so the call is a no-op rather than a
		// partial one. An animated move writes the camera from a 'tick' listener, and a listener
		// that throws stops TickManager scheduling the next frame, which kills every frame-driven
		// behavior for the rest of the session instead of surfacing the error to the caller.
		if (!Number.isFinite(_point.x) || !Number.isFinite(_point.y) || !Number.isFinite(_point.z)) {
			throw Error(
				`Editor.setCamera: expected finite values, got (${_point.x}, ${_point.y}, ${_point.z}).`
			)
		}

		this._takeCameraControl()

		const camera = this.editor.getConstrainedCamera(_point, opts)

		if (opts?.animation) {
			const { width, height } = this.editor.getViewportScreenBounds()
			this.editor._animateToViewport(
				new Box(-camera.x, -camera.y, width / camera.z, height / camera.z),
				opts
			)
		} else {
			this._setCamera(camera, {
				...opts,
				// we already did the constraining, so we don't need to do it again
				force: true,
			})
		}

		return this.editor
	}

	centerOnPoint(point: VecLike, opts?: TLCameraMoveOptions): Editor {
		const { isLocked } = this.editor.getCameraOptions()
		if (isLocked && !opts?.force) return this.editor

		const { width: pw, height: ph } = this.editor.getViewportPageBounds()
		this.editor.setCamera(
			new Vec(-(point.x - pw / 2), -(point.y - ph / 2), this.editor.getCamera().z),
			opts
		)
		return this.editor
	}

	zoomToFit(opts?: TLCameraMoveOptions): Editor {
		const ids = [...this.editor.getCurrentPageShapeIds()].filter(
			(id) => !this.editor.isShapeHidden(id)
		)
		if (ids.length <= 0) return this.editor
		const pageBounds = Box.Common(compact(ids.map((id) => this.editor.getShapePageBounds(id))))
		this.editor.zoomToBounds(pageBounds, opts)
		return this.editor
	}

	resetZoom(point = this.editor.getViewportScreenCenter(), opts?: TLCameraMoveOptions): Editor {
		const { isLocked, constraints: constraints } = this.editor.getCameraOptions()
		if (isLocked && !opts?.force) return this.editor

		const currentCamera = this.editor.getCamera()

		let z = 1

		if (constraints) {
			// For non-infinite fit, we'll set the camera to the natural zoom level...
			// unless it's already there, in which case we'll set zoom to 100%
			const initialZoom = this.editor.getInitialZoom()
			if (currentCamera.z !== initialZoom) {
				z = initialZoom
			}
		}

		this.editor.setCamera(getCameraZoomedAboutPoint(currentCamera, point, z), opts)
		return this.editor
	}

	zoomIn(point = this.editor.getViewportScreenCenter(), opts?: TLCameraMoveOptions): Editor {
		const { isLocked } = this.editor.getCameraOptions()
		if (isLocked && !opts?.force) return this.editor

		const camera = this.editor.getCamera()

		const { zoomSteps } = this.editor.getCameraOptions()
		if (zoomSteps !== null && zoomSteps.length > 1) {
			const zoom = getNextZoomStep(zoomSteps, this.editor.getBaseZoom(), camera.z, 'in')
			this.editor.setCamera(getCameraZoomedAboutPoint(camera, point, zoom), opts)
		}

		return this.editor
	}

	zoomOut(point = this.editor.getViewportScreenCenter(), opts?: TLCameraMoveOptions): Editor {
		const { isLocked } = this.editor.getCameraOptions()
		if (isLocked && !opts?.force) return this.editor

		const { zoomSteps } = this.editor.getCameraOptions()
		if (zoomSteps !== null && zoomSteps.length > 1) {
			const baseZoom = this.editor.getBaseZoom()
			const camera = this.editor.getCamera()
			const zoom = getNextZoomStep(zoomSteps, baseZoom, camera.z, 'out')
			this.editor.setCamera(getCameraZoomedAboutPoint(camera, point, zoom), opts)
		}

		return this.editor
	}

	zoomToSelection(opts?: TLCameraMoveOptions): Editor {
		const { isLocked } = this.editor.getCameraOptions()
		if (isLocked && !opts?.force) return this.editor

		const selectionPageBounds = this.editor.getSelectionPageBounds()
		if (selectionPageBounds) {
			const currentZoom = this.editor.getZoomLevel()
			// If already at 100%, zoom to fit the selection in the viewport
			// Otherwise, zoom to 100% centered on the selection
			if (Math.abs(currentZoom - 1) < 0.01) {
				this.editor.zoomToBounds(selectionPageBounds, opts)
			} else {
				this.editor.zoomToBounds(selectionPageBounds, {
					targetZoom: 1,
					...opts,
				})
			}
		}
		return this.editor
	}

	zoomToSelectionIfOffscreen(
		padding = 16,
		opts?: { targetZoom?: number; inset?: number } & TLCameraMoveOptions
	) {
		const selectionPageBounds = this.editor.getSelectionPageBounds()
		const viewportPageBounds = this.editor.getViewportPageBounds()
		if (selectionPageBounds && !viewportPageBounds.contains(selectionPageBounds)) {
			const eb = selectionPageBounds
				.clone()
				// Expand the bounds by the padding
				.expandBy(padding / this.editor.getZoomLevel())
				// then expand the bounds to include the viewport bounds
				.expand(viewportPageBounds)

			// then use the difference between the centers to calculate the offset
			const nextBounds = viewportPageBounds.clone().translate({
				x: (eb.center.x - viewportPageBounds.center.x) * 2,
				y: (eb.center.y - viewportPageBounds.center.y) * 2,
			})
			this.editor.zoomToBounds(nextBounds, opts)
		}
	}

	zoomToBounds(
		bounds: BoxLike,
		opts?: { targetZoom?: number; inset?: number } & TLCameraMoveOptions
	): Editor {
		const cameraOptions = this._cameraOptions.__unsafe__getWithoutCapture()
		if (cameraOptions.isLocked && !opts?.force) return this.editor

		const viewportScreenBounds = this.editor.getViewportScreenBounds()

		const inset =
			opts?.inset ??
			Math.min(this.editor.options.zoomToFitPadding, viewportScreenBounds.width * 0.28)

		const baseZoom = this.editor.getBaseZoom()
		const zoomMin = cameraOptions.zoomSteps[0]
		const zoomMax = last(cameraOptions.zoomSteps)!

		let zoom = clamp(
			Math.min(
				(viewportScreenBounds.width - inset) / bounds.w,
				(viewportScreenBounds.height - inset) / bounds.h
			),
			zoomMin * baseZoom,
			zoomMax * baseZoom
		)

		if (opts?.targetZoom !== undefined) {
			zoom = Math.min(opts.targetZoom, zoom)
		}

		this.editor.setCamera(
			new Vec(
				-bounds.x + (viewportScreenBounds.width - bounds.w * zoom) / 2 / zoom,
				-bounds.y + (viewportScreenBounds.height - bounds.h * zoom) / 2 / zoom,
				zoom
			),
			opts
		)

		return this.editor
	}

	stopCameraAnimation(): Editor {
		this.editor.emit('stop-camera-animation')
		return this.editor
	}

	/**
	 * Stop everything else that drives the camera — a running animation, and any user we're
	 * following — so that whatever moves the camera next isn't fighting them for it.
	 *
	 * @internal
	 */
	_takeCameraControl() {
		this.editor.stopCameraAnimation()
		if (this.editor.getInstanceState().followingUserId) {
			this.editor.stopFollowingUser()
		}
	}

	/** @internal */
	_viewportAnimation = null as null | {
		elapsed: number
		duration: number
		easing(t: number): number
		start: Box
		end: Box
		opts: TLCameraMoveOptions
	}

	/** @internal */
	@bind _animateViewport(ms: number): void {
		if (!this._viewportAnimation) return

		this._viewportAnimation.elapsed += ms

		const { elapsed, easing, duration, start, end, opts } = this._viewportAnimation

		if (elapsed > duration) {
			this.editor.off('tick', this._animateViewport)
			this._viewportAnimation = null
			// Forward the caller's options, otherwise a forced move to a position outside the
			// constraints animates there and then snaps back on this last frame
			this._setCamera(
				new Vec(-end.x, -end.y, this.editor.getViewportScreenBounds().width / end.width),
				opts
			)
			return
		}

		const remaining = duration - elapsed
		const t = easing(1 - remaining / duration)

		const left = lerp(start.minX, end.minX, t)
		const top = lerp(start.minY, end.minY, t)
		const right = lerp(start.maxX, end.maxX, t)

		this._setCamera(
			new Vec(-left, -top, this.editor.getViewportScreenBounds().width / (right - left)),
			{
				force: true,
			}
		)
	}

	_animateToViewport(
		targetViewportPage: Box,
		opts = { animation: DEFAULT_ANIMATION_OPTIONS } as TLCameraMoveOptions
	) {
		const { animation, ...rest } = opts
		if (!animation) return
		const { duration = 0, easing = EASINGS.easeInOutCubic } = animation
		const animationSpeed = this.editor.user.getAnimationSpeed()
		const viewportPageBounds = this.editor.getViewportPageBounds()

		this._takeCameraControl()

		if (duration === 0 || animationSpeed === 0) {
			// If we have no animation, then skip the animation and just set the camera
			return this._setCamera(
				new Vec(
					-targetViewportPage.x,
					-targetViewportPage.y,
					this.editor.getViewportScreenBounds().width / targetViewportPage.width
				),
				{ ...rest }
			)
		}

		// Set our viewport animation
		this._viewportAnimation = {
			elapsed: 0,
			duration: duration / animationSpeed,
			easing,
			start: viewportPageBounds.clone(),
			end: targetViewportPage.clone(),
			opts: rest,
		}

		// If we ever get a "stop-camera-animation" event, we stop
		this.editor.once('stop-camera-animation', () => {
			this.editor.off('tick', this._animateViewport)
			this._viewportAnimation = null
		})

		// On each tick, animate the viewport
		this.editor.on('tick', this._animateViewport)

		return this.editor
	}

	slideCamera(
		opts = {} as {
			speed: number
			direction: VecLike
			friction?: number
			speedThreshold?: number
			force?: boolean
		}
	): Editor {
		const { isLocked } = this.editor.getCameraOptions()
		if (isLocked && !opts?.force) return this.editor

		const animationSpeed = this.editor.user.getAnimationSpeed()
		if (animationSpeed === 0) return this.editor

		this.editor.stopCameraAnimation()

		const {
			speed,
			friction = this.editor.options.cameraSlideFriction,
			direction,
			speedThreshold = 0.01,
		} = opts
		let currentSpeed = Math.min(speed, 1)

		const cancel = () => {
			this.editor.off('tick', moveCamera)
			this.editor.off('stop-camera-animation', cancel)
		}

		this.editor.once('stop-camera-animation', cancel)

		const dirZ = direction.z ?? 0

		const moveCamera = (elapsed: number) => {
			const { x: cx, y: cy, z: cz } = this.editor.getCamera()

			// Pan movement from x/y direction
			const dx = (direction.x * (currentSpeed * elapsed)) / cz
			const dy = (direction.y * (currentSpeed * elapsed)) / cz

			let newCx = cx + dx
			let newCy = cy + dy
			let newCz = cz

			// animate zoom if z direction is passed in. Use an exponential factor so that a single
			// long frame can't drive the zoom to zero or negative (which would give NaN coordinates)
			if (dirZ !== 0) {
				newCz = cz * Math.exp(dirZ * currentSpeed * elapsed)
				// Adjust x/y to keep the viewport center fixed while zooming
				const center = this.editor.getViewportScreenCenter()
				newCx += center.x / newCz - center.x / cz
				newCy += center.y / newCz - center.y / cz
			}

			// Apply friction per unit of elapsed time, not per tick, or a 120 Hz display decays twice as fast
			currentSpeed *= (1 - friction) ** (elapsed / FRAME_MS_60HZ)
			if (currentSpeed < speedThreshold) {
				cancel()
			} else {
				this._setCamera(new Vec(newCx, newCy, newCz))
			}
		}

		this.editor.on('tick', moveCamera)

		return this.editor
	}

	zoomToUser(
		userId: TLUserId,
		opts: TLCameraMoveOptions = { animation: { duration: 500 } }
	): Editor {
		const presence = this.editor.getCollaborators().find((c) => c.userId === userId)

		if (!presence) return this.editor

		const cursor = presence.cursor
		if (!cursor) return this.editor

		this.editor.run(() => {
			// If we're following someone, stop following them
			if (this.editor.getInstanceState().followingUserId !== null) {
				this.editor.stopFollowingUser()
			}

			// If we're not on the same page, move to the page they're on
			const isOnSamePage = presence.currentPageId === this.editor.getCurrentPageId()
			if (!isOnSamePage) {
				this.editor.markHistoryStoppingPoint('change-page')
				this.editor.setCurrentPage(presence.currentPageId)
			}

			// Only animate the camera if the user is on the same page as us
			if (opts && opts.animation && !isOnSamePage) {
				opts.animation = undefined
			}

			this.editor.centerOnPoint(cursor, opts)

			// Highlight the user's cursor
			const { highlightedUserIds } = this.editor.getInstanceState()
			this.editor.updateInstanceState({ highlightedUserIds: [...highlightedUserIds, userId] })

			// Unhighlight the user's cursor after a few seconds
			this.editor.timers.setTimeout(() => {
				const highlightedUserIds = [...this.editor.getInstanceState().highlightedUserIds]
				const index = highlightedUserIds.indexOf(userId)
				if (index < 0) return
				highlightedUserIds.splice(index, 1)
				this.editor.updateInstanceState({ highlightedUserIds })
			}, this.editor.options.collaboratorIdleTimeoutMs)
		})

		return this.editor
	}

	// Viewport

	/** @internal */
	_willSetInitialBounds = true

	updateViewportScreenBounds(screenBounds: Box | HTMLElement, center = false): Editor {
		if (!(screenBounds instanceof Box)) {
			const rect = screenBounds.getBoundingClientRect()
			screenBounds = new Box(
				rect.left || rect.x,
				rect.top || rect.y,
				Math.max(rect.width, 1),
				Math.max(rect.height, 1)
			)
		} else {
			screenBounds.width = Math.max(screenBounds.width, 1)
			screenBounds.height = Math.max(screenBounds.height, 1)
		}

		const doc = this.editor.getContainerDocument()
		// If the container's document has been torn down (e.g. an iframe being
		// removed), its body is null and there's nothing meaningful to measure.
		if (!doc.body) return this.editor

		const insets = [
			// top
			screenBounds.minY !== 0,
			// right
			!approximately(doc.body.scrollWidth, screenBounds.maxX, 1),
			// bottom
			!approximately(doc.body.scrollHeight, screenBounds.maxY, 1),
			// left
			screenBounds.minX !== 0,
		]

		const { _willSetInitialBounds } = this

		this._willSetInitialBounds = false

		const { screenBounds: prevScreenBounds, insets: prevInsets } = this.editor.getInstanceState()
		if (screenBounds.equals(prevScreenBounds) && insets.every((v, i) => v === prevInsets[i])) {
			// nothing to do
			return this.editor
		}

		if (_willSetInitialBounds) {
			// If we have just received the initial bounds, don't center the camera.
			this.editor.updateInstanceState({ screenBounds: screenBounds.toJson(), insets })
			this.editor.emit('resize', screenBounds.toJson())
			this.editor.setCamera(this.editor.getCamera())
		} else {
			if (center && !this.editor.getInstanceState().followingUserId) {
				// Get the page center before the change, make the change, and restore it
				const before = this.editor.getViewportPageBounds().center
				this.editor.updateInstanceState({ screenBounds: screenBounds.toJson(), insets })
				this.editor.emit('resize', screenBounds.toJson())
				this.editor.centerOnPoint(before)
			} else {
				// Otherwise,
				this.editor.updateInstanceState({ screenBounds: screenBounds.toJson(), insets })
				this.editor.emit('resize', screenBounds.toJson())
				this._setCamera(Vec.From({ ...this.editor.getCamera() }))
			}
		}

		return this.editor
	}

	@computed getViewportScreenBounds() {
		const { x, y, w, h } = this.editor.getInstanceState().screenBounds
		return new Box(x, y, w, h)
	}

	@computed getViewportScreenCenter() {
		const viewportScreenBounds = this.editor.getViewportScreenBounds()
		return new Vec(viewportScreenBounds.w / 2, viewportScreenBounds.h / 2)
	}

	@computed getViewportPageBounds() {
		const { w, h } = this.editor.getViewportScreenBounds()
		const { x: cx, y: cy, z: cz } = this.editor.getCamera()
		return new Box(-cx, -cy, w / cz, h / cz)
	}

	screenToPage(point: VecLike) {
		const { screenBounds } = this.editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!
		const { x: cx, y: cy, z: cz = 1 } = this.editor.getCamera()
		return new Vec(
			(point.x - screenBounds.x) / cz - cx,
			(point.y - screenBounds.y) / cz - cy,
			point.z ?? 0.5
		)
	}

	pageToScreen(point: VecLike) {
		const { screenBounds } = this.editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!
		const { x: cx, y: cy, z: cz = 1 } = this.editor.getCamera()
		return new Vec(
			(point.x + cx) * cz + screenBounds.x,
			(point.y + cy) * cz + screenBounds.y,
			point.z ?? 0.5
		)
	}

	pageToViewport(point: VecLike) {
		const { x: cx, y: cy, z: cz = 1 } = this.editor.getCamera()
		return new Vec((point.x + cx) * cz, (point.y + cy) * cz, point.z ?? 0.5)
	}

	// Following

	// When we are 'locked on' to a user, our camera is derived from their camera.
	_isLockedOnFollowingUser = atom('isLockedOnFollowingUser', false)

	startFollowingUser(userId: TLUserId): Editor {
		// if we were already following someone, stop following them
		this.editor.stopFollowingUser()

		const thisUserId = this.editor.user.getExternalId()

		if (!thisUserId) {
			console.warn('You should set the userId for the current instance before following a user')
			// allow to continue since it's probably fine most of the time.
		}

		const leaderPresence = this._getFollowingPresence(userId)

		if (!leaderPresence) {
			return this.editor
		}

		const latestLeaderPresence = computed('latestLeaderPresence', () => {
			return this._getFollowingPresence(userId)
		})

		transact(() => {
			this.editor.updateInstanceState({ followingUserId: userId }, { history: 'ignore' })

			// we listen for page changes separately from the 'moveTowardsUser' tick
			const dispose = react('update current page', () => {
				const leaderPresence = latestLeaderPresence.get()
				if (!leaderPresence) {
					this.editor.stopFollowingUser()
					return
				}
				if (
					leaderPresence.currentPageId !== this.editor.getCurrentPageId() &&
					this.editor.getPage(leaderPresence.currentPageId)
				) {
					// if the page changed, switch page
					this.editor.run(
						() => {
							// sneaky store.put here, we can't go through setCurrentPage because it calls stopFollowingUser
							this.editor.store.put([
								{ ...this.editor.getInstanceState(), currentPageId: leaderPresence.currentPageId },
							])
							this._isLockedOnFollowingUser.set(true)
						},
						{ history: 'ignore' }
					)
				}
			})

			const cancel = () => {
				dispose()
				this._isLockedOnFollowingUser.set(false)
				this.editor.off('frame', moveTowardsUser)
				this.editor.off('stop-following', cancel)
			}

			const moveTowardsUser = () => {
				// Stop following if we can't find the user
				const leaderPresence = latestLeaderPresence.get()
				if (!leaderPresence) {
					this.editor.stopFollowingUser()
					return
				}

				if (this._isLockedOnFollowingUser.get()) return

				const animationSpeed = this.editor.user.getAnimationSpeed()

				if (animationSpeed === 0) {
					this._isLockedOnFollowingUser.set(true)
					return
				}

				const targetViewport = this.getViewportPageBoundsForFollowing()
				if (!targetViewport) {
					this.editor.stopFollowingUser()
					return
				}
				const currentViewport = this.editor.getViewportPageBounds()

				const diffX =
					Math.abs(targetViewport.minX - currentViewport.minX) +
					Math.abs(targetViewport.maxX - currentViewport.maxX)
				const diffY =
					Math.abs(targetViewport.minY - currentViewport.minY) +
					Math.abs(targetViewport.maxY - currentViewport.maxY)

				// Stop chasing if we're close enough!
				if (
					diffX < this.editor.options.followChaseViewportSnap &&
					diffY < this.editor.options.followChaseViewportSnap
				) {
					this._isLockedOnFollowingUser.set(true)
					return
				}

				// Chase the user's viewport!
				// Interpolate between the current viewport and the target viewport based on animation speed.
				// This will produce an 'ease-out' effect.
				const t = clamp(animationSpeed * 0.5, 0.1, 0.8)

				const nextViewport = new Box(
					lerp(currentViewport.minX, targetViewport.minX, t),
					lerp(currentViewport.minY, targetViewport.minY, t),
					lerp(currentViewport.width, targetViewport.width, t),
					lerp(currentViewport.height, targetViewport.height, t)
				)

				const nextCamera = new Vec(
					-nextViewport.x,
					-nextViewport.y,
					this.editor.getViewportScreenBounds().width / nextViewport.width
				)

				// Update the camera!
				this.editor.stopCameraAnimation()
				this._setCamera(nextCamera)
			}

			this.editor.once('stop-following', cancel)
			this.editor.addListener('frame', moveTowardsUser)

			// call once to start synchronously
			moveTowardsUser()
		})

		return this.editor
	}

	stopFollowingUser(): Editor {
		this.editor.run(
			() => {
				// commit the current camera to the store
				this.editor.store.put([this.editor.getCamera()])
				// this must happen after the camera is committed
				this._isLockedOnFollowingUser.set(false)
				this.editor.updateInstanceState({ followingUserId: null })
				this.editor.emit('stop-following')
			},
			{ history: 'ignore' }
		)
		return this.editor
	}

	// Camera state
	// Camera state does two things: first, it allows us to subscribe to whether
	// the camera is moving or not; and second, it allows us to update the rendering
	// shapes on the canvas. Changing the rendering shapes may cause shapes to
	// unmount / remount in the DOM, which is expensive; and computing visibility is
	// also expensive in large projects. For this reason, we use a second bounding
	// box just for rendering, and we only update after the camera stops moving.
	_cameraStateTimeoutRemaining = 0
	@bind _decayCameraStateTimeout(elapsed: number) {
		this._cameraStateTimeoutRemaining -= elapsed
		if (this._cameraStateTimeoutRemaining > 0) return
		this.editor.off('tick', this._decayCameraStateTimeout)
		this._setCameraState('idle')
	}
	_tickCameraState() {
		// always reset the timeout
		this._cameraStateTimeoutRemaining = this.editor.options.cameraMovingTimeoutMs
		// If the state is idle, then start the tick
		if (this.editor.getInstanceState().cameraState !== 'idle') return
		this._setCameraState('moving')
		this._debouncedZoomLevel.set(unsafe__withoutCapture(() => this.editor.getCamera().z))
		this.editor.on('tick', this._decayCameraStateTimeout)
	}
	_setCameraState(cameraState: 'idle' | 'moving') {
		this.editor.updateInstanceState({ cameraState }, { history: 'ignore' })
	}

	getCameraState() {
		return this.editor.getInstanceState().cameraState
	}
}
