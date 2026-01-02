import { atom, computed, react, transact, unsafe__withoutCapture } from '@tldraw/state'
import { CameraRecordType, TLCamera, TLINSTANCE_ID, TLInstancePresence } from '@tldraw/tlschema'
import { compact, exhaustiveSwitchError, last, lerp, structuredClone } from '@tldraw/utils'
import {
	DEFAULT_ANIMATION_OPTIONS,
	DEFAULT_CAMERA_OPTIONS,
	INTERNAL_POINTER_IDS,
	ZOOM_TO_FIT_PADDING,
} from '../../../constants'
import { Box, BoxLike } from '../../../primitives/Box'
import { Vec, VecLike } from '../../../primitives/Vec'
import { EASINGS } from '../../../primitives/easings'
import { approximately, clamp } from '../../../primitives/utils'
import type { Editor } from '../../Editor'
import { TLCameraMoveOptions, TLCameraOptions } from '../../types/misc-types'

/** @public */
export class CameraManager {
	private readonly editor: Editor

	constructor(editor: Editor, cameraOptions?: Partial<TLCameraOptions>) {
		this.editor = editor
		this._cameraOptions.set({ ...DEFAULT_CAMERA_OPTIONS, ...cameraOptions })

		// Bind methods that are used as event handlers to preserve context
		this._animateViewport = this._animateViewport.bind(this)
		this._decayCameraStateTimeout = this._decayCameraStateTimeout.bind(this)
	}

	// Camera state atoms
	private _cameraOptions = atom('camera options', DEFAULT_CAMERA_OPTIONS)
	private _debouncedZoomLevel = atom('debounced zoom level', 1)
	private _isLockedOnFollowingUser = atom('isLockedOnFollowingUser', false)

	/** @internal */
	private _viewportAnimation = null as null | {
		elapsed: number
		duration: number
		easing(t: number): number
		start: Box
		end: Box
	}

	private _cameraState = atom('camera state', 'idle' as 'idle' | 'moving')
	private _cameraStateTimeoutRemaining = 0

	// Camera configuration methods

	/**
	 * Get the current camera options.
	 *
	 * @example
	 * ```ts
	 * editor.getCameraOptions()
	 * ```
	 *
	 * @public
	 */
	getCameraOptions() {
		return this._cameraOptions.get()
	}

	/**
	 * Set the camera options.
	 *
	 * @example
	 * ```ts
	 * editor.setCameraOptions({ isLocked: true })
	 * ```
	 *
	 * @param opts - The camera options to set.
	 * @public
	 */
	setCameraOptions(opts: Partial<TLCameraOptions>) {
		const next = structuredClone({
			...this._cameraOptions.__unsafe__getWithoutCapture(),
			...opts,
		})
		if (next.zoomSteps?.length < 1) next.zoomSteps = [1]
		this._cameraOptions.set(next)
		this.editor.setCamera(this.editor.getCamera())
		return this
	}

	// Core camera operations

	/** @internal */
	@computed
	_unsafe_getCameraId() {
		return CameraRecordType.createId(this.editor.getCurrentPageId())
	}

	/**
	 * Get the current camera.
	 *
	 * @example
	 * ```ts
	 * editor.getCamera()
	 * ```
	 *
	 * @public
	 */
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

	/**
	 * Set the camera.
	 *
	 * @example
	 * ```ts
	 * editor.setCamera({ x: 0, y: 0, z: 1 })
	 * ```
	 *
	 * @param point - The camera point.
	 * @param opts - The camera move options.
	 * @public
	 */
	setCamera(point: VecLike, opts?: TLCameraMoveOptions): this {
		const { isLocked } = this._cameraOptions.__unsafe__getWithoutCapture()
		if (isLocked && !opts?.force) return this

		// Stop any camera animations
		this.stopCameraAnimation()

		// Stop following any user
		if (this.editor.getInstanceState().followingUserId) {
			this.stopFollowingUser()
		}

		const _point = Vec.Cast(point)

		if (!Number.isFinite(_point.x)) _point.x = 0
		if (!Number.isFinite(_point.y)) _point.y = 0
		if (_point.z === undefined || !Number.isFinite(_point.z)) point.z = this.getZoomLevel()

		const camera = this.getConstrainedCamera(_point, opts)

		if (opts?.animation) {
			const { width, height } = this.getViewportScreenBounds()
			this._animateToViewport(
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

		return this
	}

	/** @internal */
	_setCamera(point: VecLike, opts?: TLCameraMoveOptions): this {
		const currentCamera = this.getCamera()

		const { x, y, z } = this.getConstrainedCamera(point, opts)

		if (currentCamera.x === x && currentCamera.y === y && currentCamera.z === z) {
			return this
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

		return this
	}

	// Zoom operations

	/**
	 * Get the current zoom level.
	 *
	 * @example
	 * ```ts
	 * editor.getZoomLevel()
	 * ```
	 *
	 * @public
	 */
	@computed getZoomLevel() {
		return this.getCamera().z
	}

	/**
	 * Get the debounced zoom level. When the camera is moving, this returns the zoom level
	 * from when the camera started moving rather than the current zoom level. This can be
	 * used to avoid expensive re-renders during camera movements.
	 *
	 * This behavior is controlled by the `useDebouncedZoom` option. When `useDebouncedZoom`
	 * is `false`, this method always returns the current zoom level.
	 *
	 * @public
	 */
	@computed getDebouncedZoomLevel() {
		if (this.editor.options.debouncedZoom) {
			if (this.getCameraState() === 'idle') {
				return this.getZoomLevel()
			} else {
				return this._debouncedZoomLevel.get()
			}
		}

		return this.getZoomLevel()
	}

	/**
	 * Get the initial zoom level for the editor. This is the zoom level used when the
	 * editor first loads based on the camera constraints (if any).
	 *
	 * @example
	 * ```ts
	 * editor.getInitialZoom()
	 * ```
	 *
	 * @public */
	getInitialZoom() {
		const cameraOptions = this.getCameraOptions()
		// If no camera constraints are provided, the default zoom is 100%
		if (!cameraOptions.constraints) return 1

		// When defaultZoom is default, the default zoom is 100%
		if (cameraOptions.constraints.initialZoom === 'default') return 1

		const { zx, zy } = this._getCameraFitXFitY(cameraOptions)

		switch (cameraOptions.constraints.initialZoom) {
			case 'fit-min': {
				return Math.max(zx, zy)
			}
			case 'fit-max': {
				return Math.min(zx, zy)
			}
			case 'fit-x': {
				return zx
			}
			case 'fit-y': {
				return zy
			}
			case 'fit-min-100': {
				return Math.min(1, Math.max(zx, zy))
			}
			case 'fit-max-100': {
				return Math.min(1, Math.min(zx, zy))
			}
			case 'fit-x-100': {
				return Math.min(1, zx)
			}
			case 'fit-y-100': {
				return Math.min(1, zy)
			}
			default: {
				throw exhaustiveSwitchError(cameraOptions.constraints.initialZoom)
			}
		}
	}

	/**
	 * Get the base zoom level for the editor. This is the "natural" 100% zoom based on the
	 * camera constraints (if any).
	 *
	 * @example
	 * ```ts
	 * editor.getBaseZoom()
	 * ```
	 *
	 * @public */
	getBaseZoom() {
		const cameraOptions = this.getCameraOptions()
		// If no camera constraints are provided, the default zoom is 100%
		if (!cameraOptions.constraints) return 1

		// When defaultZoom is default, the default zoom is 100%
		if (cameraOptions.constraints.baseZoom === 'default') return 1

		const { zx, zy } = this._getCameraFitXFitY(cameraOptions)

		switch (cameraOptions.constraints.baseZoom) {
			case 'fit-min': {
				return Math.max(zx, zy)
			}
			case 'fit-max': {
				return Math.min(zx, zy)
			}
			case 'fit-x': {
				return zx
			}
			case 'fit-y': {
				return zy
			}
			case 'fit-min-100': {
				return Math.min(1, Math.max(zx, zy))
			}
			case 'fit-max-100': {
				return Math.min(1, Math.min(zx, zy))
			}
			case 'fit-x-100': {
				return Math.min(1, zx)
			}
			case 'fit-y-100': {
				return Math.min(1, zy)
			}
			default: {
				throw exhaustiveSwitchError(cameraOptions.constraints.baseZoom)
			}
		}
	}

	/**
	 * Zoom the camera in.
	 *
	 * @example
	 * ```ts
	 * editor.zoomIn()
	 * editor.zoomIn(editor.getViewportScreenCenter(), { animation: { duration: 120 } })
	 * ```
	 *
	 * @param point - The screen point to zoom in on. Defaults to the screen center
	 * @param opts - The camera move options.
	 *
	 * @public
	 */
	zoomIn(point = this.editor.getViewportScreenCenter(), opts?: TLCameraMoveOptions): this {
		const { isLocked } = this.getCameraOptions()
		if (isLocked && !opts?.force) return this

		const { x: cx, y: cy, z: cz } = this.getCamera()

		const { zoomSteps } = this.getCameraOptions()
		if (zoomSteps !== null && zoomSteps.length > 1) {
			const baseZoom = this.getBaseZoom()
			let zoom = last(zoomSteps)! * baseZoom
			for (let i = 1; i < zoomSteps.length; i++) {
				const z1 = zoomSteps[i - 1] * baseZoom
				const z2 = zoomSteps[i] * baseZoom
				if (z2 - cz <= (z2 - z1) / 2) continue
				zoom = z2
				break
			}
			this.setCamera(
				new Vec(
					cx + (point.x / zoom - point.x) - (point.x / cz - point.x),
					cy + (point.y / zoom - point.y) - (point.y / cz - point.y),
					zoom
				),
				opts
			)
		}

		return this
	}

	/**
	 * Zoom the camera out.
	 *
	 * @example
	 * ```ts
	 * editor.zoomOut()
	 * editor.zoomOut(editor.getViewportScreenCenter(), { animation: { duration: 120 } })
	 * ```
	 *
	 * @param point - The point to zoom out on. Defaults to the viewport screen center.
	 * @param opts - The camera move options.
	 *
	 * @public
	 */
	zoomOut(point = this.editor.getViewportScreenCenter(), opts?: TLCameraMoveOptions): this {
		const { isLocked } = this.getCameraOptions()
		if (isLocked && !opts?.force) return this

		const { zoomSteps } = this.getCameraOptions()
		if (zoomSteps !== null && zoomSteps.length > 1) {
			const baseZoom = this.getBaseZoom()
			const { x: cx, y: cy, z: cz } = this.getCamera()
			// start at the max
			let zoom = zoomSteps[0] * baseZoom
			for (let i = zoomSteps.length - 1; i > 0; i--) {
				const z1 = zoomSteps[i - 1] * baseZoom
				const z2 = zoomSteps[i] * baseZoom
				if (z2 - cz >= (z2 - z1) / 2) continue
				zoom = z1
				break
			}
			this.setCamera(
				new Vec(
					cx + (point.x / zoom - point.x) - (point.x / cz - point.x),
					cy + (point.y / zoom - point.y) - (point.y / cz - point.y),
					zoom
				),
				opts
			)
		}

		return this
	}

	/**
	 * Set the zoom back to 100%.
	 *
	 * @example
	 * ```ts
	 * editor.resetZoom()
	 * editor.resetZoom(editor.getViewportScreenCenter(), { animation: { duration: 200 } })
	 * editor.resetZoom(editor.getViewportScreenCenter(), { animation: { duration: 200 } })
	 * ```
	 *
	 * @param point - The screen point to zoom out on. Defaults to the viewport screen center.
	 * @param opts - The camera move options.
	 *
	 * @public
	 */
	resetZoom(point = this.editor.getViewportScreenCenter(), opts?: TLCameraMoveOptions): this {
		const { isLocked, constraints: constraints } = this.getCameraOptions()
		if (isLocked && !opts?.force) return this

		const currentCamera = this.getCamera()
		const { x: cx, y: cy, z: cz } = currentCamera
		const { x, y } = point

		let z = 1

		if (constraints) {
			// For non-infinite fit, we'll set the camera to the natural zoom level...
			// unless it's already there, in which case we'll set zoom to 100%
			const initialZoom = this.getInitialZoom()
			if (cz !== initialZoom) {
				z = initialZoom
			}
		}

		this.setCamera(
			new Vec(cx + (x / z - x) - (x / cz - x), cy + (y / z - y) - (y / cz - y), z),
			opts
		)
		return this
	}

	/**
	 * Zoom the camera to fit the current page's content in the viewport.
	 *
	 * @example
	 * ```ts
	 * editor.zoomToFit()
	 * editor.zoomToFit({ animation: { duration: 200 } })
	 * ```
	 *
	 * @param opts - The camera move options.
	 *
	 * @public
	 */
	zoomToFit(opts?: TLCameraMoveOptions): this {
		const ids = [...this.editor.getCurrentPageShapeIds()]
		if (ids.length <= 0) return this
		const pageBounds = Box.Common(compact(ids.map((id) => this.editor.getShapePageBounds(id))))
		this.zoomToBounds(pageBounds, opts)
		return this
	}

	/**
	 * Zoom the camera to fit a bounding box (in the current page space).
	 *
	 * @example
	 * ```ts
	 * editor.zoomToBounds(myBounds)
	 * editor.zoomToBounds(myBounds, { animation: { duration: 200 } })
	 * editor.zoomToBounds(myBounds, { animation: { duration: 200 }, inset: 0, targetZoom: 1 })
	 * ```
	 *
	 * @param bounds - The bounding box.
	 * @param opts - The camera move options, target zoom, or custom inset amount.
	 *
	 * @public
	 */
	zoomToBounds(
		bounds: BoxLike,
		opts?: { targetZoom?: number; inset?: number } & TLCameraMoveOptions
	): this {
		const cameraOptions = this._cameraOptions.__unsafe__getWithoutCapture()
		if (cameraOptions.isLocked && !opts?.force) return this

		const viewportScreenBounds = this.getViewportScreenBounds()

		const inset = opts?.inset ?? Math.min(ZOOM_TO_FIT_PADDING, viewportScreenBounds.width * 0.28)

		const baseZoom = this.getBaseZoom()
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

		this.setCamera(
			new Vec(
				-bounds.x + (viewportScreenBounds.width - bounds.w * zoom) / 2 / zoom,
				-bounds.y + (viewportScreenBounds.height - bounds.h * zoom) / 2 / zoom,
				zoom
			),
			opts
		)
		return this
	}

	// Selection-related zoom

	/**
	 * Zoom the camera to the current selection.
	 *
	 * @example
	 * ```ts
	 * editor.zoomToSelection()
	 * ```
	 *
	 * @param opts - The camera move options.
	 *
	 * @public
	 */
	zoomToSelection(opts?: TLCameraMoveOptions): this {
		const { isLocked } = this.getCameraOptions()
		if (isLocked && !opts?.force) return this

		const selectionPageBounds = this.editor.getSelectionPageBounds()
		if (selectionPageBounds) {
			this.zoomToBounds(selectionPageBounds, {
				targetZoom: Math.max(1, this.getZoomLevel()),
				...opts,
			})
		}
		return this
	}

	/**
	 * Zoom the camera to the current selection if offscreen.
	 *
	 * @public
	 */
	zoomToSelectionIfOffscreen(
		padding = 16,
		opts?: { targetZoom?: number; inset?: number } & TLCameraMoveOptions
	) {
		const selectionPageBounds = this.editor.getSelectionPageBounds()
		const viewportPageBounds = this.getViewportPageBounds()
		if (selectionPageBounds && !viewportPageBounds.contains(selectionPageBounds)) {
			const eb = selectionPageBounds
				.clone()
				// Expand the bounds by the padding
				.expandBy(padding / this.getZoomLevel())
				// then expand the bounds to include the viewport bounds
				.expand(viewportPageBounds)

			// then use the difference between the centers to calculate the offset
			const nextBounds = viewportPageBounds.clone().translate({
				x: (eb.center.x - viewportPageBounds.center.x) * 2,
				y: (eb.center.y - viewportPageBounds.center.y) * 2,
			})
			this.zoomToBounds(nextBounds, opts)
		}
	}

	/**
	 * Zoom the camera to a user's cursor position.
	 * This also switches to the user's currently viewed page.
	 *
	 * @example
	 * ```ts
	 * editor.zoomToUser(userId)
	 * ```
	 *
	 * @param userId - The id of the user to animate to.
	 * @param opts - The camera move options.
	 * @public
	 */
	zoomToUser(userId: string, opts: TLCameraMoveOptions = { animation: { duration: 500 } }): this {
		const presence = this.editor.getCollaborators().find((c) => c.userId === userId)

		if (!presence) return this

		const cursor = presence.cursor
		if (!cursor) return this

		this.editor.run(() => {
			// If we're following someone, stop following them
			if (this.editor.getInstanceState().followingUserId !== null) {
				this.stopFollowingUser()
			}

			// If we're not on the same page, move to the page they're on
			const isOnSamePage = presence.currentPageId === this.editor.getCurrentPageId()
			if (!isOnSamePage) {
				this.editor.setCurrentPage(presence.currentPageId)
			}

			// Only animate the camera if the user is on the same page as us
			if (opts && opts.animation && !isOnSamePage) {
				opts.animation = undefined
			}

			this.centerOnPoint(cursor, opts)

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

		return this
	}

	// Camera movement

	/**
	 * Center the camera on a point (in the current page space).
	 *
	 * @example
	 * ```ts
	 * editor.centerOnPoint({ x: 100, y: 100 })
	 * editor.centerOnPoint({ x: 100, y: 100 }, { animation: { duration: 200 } })
	 * ```
	 *
	 * @param point - The point in the current page space to center on.
	 * @param opts - The camera move options.
	 *
	 * @public
	 */
	centerOnPoint(point: VecLike, opts?: TLCameraMoveOptions): this {
		const { isLocked } = this.getCameraOptions()
		if (isLocked && !opts?.force) return this

		const { width: pw, height: ph } = this.getViewportPageBounds()
		this.setCamera(new Vec(-(point.x - pw / 2), -(point.y - ph / 2), this.getCamera().z), opts)
		return this
	}

	/**
	 * Stop the current camera animation, if any.
	 *
	 * @example
	 * ```ts
	 * editor.stopCameraAnimation()
	 * ```
	 *
	 * @public
	 */
	stopCameraAnimation(): this {
		this.editor.emit('stop-camera-animation')
		return this
	}

	/**
	 * Slide the camera in a certain direction.
	 *
	 * @example
	 * ```ts
	 * editor.slideCamera({ speed: 2, direction: { x: 1, y: 1 }, friction: 0.1 })
	 * ```
	 *
	 * @param opts - Options for the slide
	 * @public
	 */
	slideCamera(
		opts = {} as {
			speed: number
			direction: VecLike
			friction?: number
			speedThreshold?: number
			force?: boolean
		}
	): this {
		const { isLocked } = this.getCameraOptions()
		if (isLocked && !opts?.force) return this

		const animationSpeed = this.editor.user.getAnimationSpeed()
		if (animationSpeed === 0) return this

		this.stopCameraAnimation()

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

		const moveCamera = (elapsed: number) => {
			const { x: cx, y: cy, z: cz } = this.getCamera()
			const moveDist = currentSpeed * elapsed

			if (currentSpeed > speedThreshold) {
				this._setCamera(
					new Vec(cx + (moveDist * direction.x) / cz, cy + (moveDist * direction.y) / cz, cz),
					{
						force: true,
					}
				)
				currentSpeed *= 1 - friction
			} else {
				this.editor.off('tick', moveCamera)
			}
		}

		this.editor.on('tick', moveCamera)

		return this
	}

	// Animation

	/** @internal */
	_animateViewport(ms: number): void {
		if (!this._viewportAnimation) return

		this._viewportAnimation.elapsed += ms

		const { elapsed, easing, duration, start, end } = this._viewportAnimation

		if (elapsed > duration) {
			this.editor.off('tick', this._animateViewport)
			this._viewportAnimation = null
			this._setCamera(new Vec(-end.x, -end.y, this.getViewportScreenBounds().width / end.width))
			return
		}

		const remaining = duration - elapsed
		const t = easing(1 - remaining / duration)

		const left = start.minX + (end.minX - start.minX) * t
		const top = start.minY + (end.minY - start.minY) * t
		const right = start.maxX + (end.maxX - start.maxX) * t
		const bottom = start.maxY + (end.maxY - start.maxY) * t

		const easedViewport = new Box(left, top, right - left, bottom - top)

		this._setCamera(
			new Vec(
				-easedViewport.x,
				-easedViewport.y,
				this.getViewportScreenBounds().width / easedViewport.width
			),
			{
				force: true,
			}
		)
	}

	/** @internal */
	_animateToViewport(
		targetViewportPage: Box,
		opts = { animation: DEFAULT_ANIMATION_OPTIONS } as TLCameraMoveOptions
	) {
		const { animation, ...rest } = opts
		if (!animation) return
		const { duration = 0, easing = EASINGS.easeInOutCubic } = animation
		const animationSpeed = this.editor.user.getAnimationSpeed()
		const viewportPageBounds = this.getViewportPageBounds()

		// If we have an existing animation, then stop it
		this.stopCameraAnimation()

		// also stop following any user
		if (this.editor.getInstanceState().followingUserId) {
			this.stopFollowingUser()
		}

		if (duration === 0 || animationSpeed === 0) {
			// If we have no animation, then skip the animation and just set the camera
			return this._setCamera(
				new Vec(
					-targetViewportPage.x,
					-targetViewportPage.y,
					this.getViewportScreenBounds().width / targetViewportPage.width
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
		}

		// If we ever get a "stop-camera-animation" event, we stop
		this.editor.once('stop-camera-animation', () => {
			this._viewportAnimation = null
			this.editor.off('tick', this._animateViewport)
		})

		this.editor.on('tick', this._animateViewport)
	}

	// Following

	/**
	 * Start viewport-following a user.
	 *
	 * @example
	 * ```ts
	 * editor.startFollowingUser(userId)
	 * ```
	 *
	 * @param userId - The id of the user to follow.
	 *
	 * @public
	 */
	startFollowingUser(userId: string): this {
		// if we were already following someone, stop following them
		this.stopFollowingUser()

		const thisUserId = this.editor.user.getId()

		if (!thisUserId) {
			console.warn('You should set the userId for the current instance before following a user')
			// allow to continue since it's probably fine most of the time.
		}

		const leaderPresence = this._getFollowingPresence(userId)

		if (!leaderPresence) {
			return this
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
					this.stopFollowingUser()
					return
				}

				const isOnSamePage = leaderPresence.currentPageId === this.editor.getCurrentPageId()
				if (!isOnSamePage) {
					this.editor.setCurrentPage(leaderPresence.currentPageId)
				}
			})

			this.editor.once('stop-following', dispose)

			const moveTowardsUser = () => {
				// Stop following if we can't find the user
				const leaderPresence = latestLeaderPresence.get()
				if (!leaderPresence) {
					this.stopFollowingUser()
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
					this.stopFollowingUser()
					return
				}
				const currentViewport = this.getViewportPageBounds()

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

				this._animateToViewport(nextViewport, { animation: { duration: 33 } })
			}

			this.editor.on('frame', moveTowardsUser)
			this.editor.once('stop-following', () => this.editor.off('frame', moveTowardsUser))
		})

		return this
	}

	/**
	 * Stop viewport-following a user.
	 *
	 * @example
	 * ```ts
	 * editor.stopFollowingUser()
	 * ```
	 * @public
	 */
	stopFollowingUser(): this {
		this.editor.run(
			() => {
				// commit the current camera to the store
				this.editor.store.put([this.getCamera()])
				// this must happen after the camera is committed
				this._isLockedOnFollowingUser.set(false)
				this.editor.updateInstanceState({ followingUserId: null })
				this.editor.emit('stop-following')
			},
			{ history: 'ignore' }
		)
		return this
	}

	_getFollowingPresence(targetUserId: string | null) {
		const visited = [this.editor.user.getId()]
		const collaborators = this.editor.getCollaborators()
		let leaderPresence = null as null | TLInstancePresence
		while (targetUserId && !visited.includes(targetUserId)) {
			leaderPresence = collaborators.find((c) => c.userId === targetUserId) ?? null
			targetUserId = leaderPresence?.followingUserId ?? null
			if (leaderPresence) {
				visited.push(leaderPresence.userId)
			}
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
		const theirViewport = Box.From({
			x: -leaderPresence.camera.x,
			y: -leaderPresence.camera.y,
			w: leaderPresence.screenBounds.w / leaderPresence.camera.z,
			h: leaderPresence.screenBounds.h / leaderPresence.camera.z,
		})

		const ourViewport = this.getViewportPageBounds()
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
			z: this.getViewportScreenBounds().w / viewport.width,
		}
	}

	// Viewport operations

	/**
	 * The bounds of the editor's viewport in screen space.
	 *
	 * @public
	 */
	@computed getViewportScreenBounds() {
		const { x, y, w, h } = this.editor.getInstanceState().screenBounds
		return new Box(x, y, w, h)
	}

	/**
	 * The current viewport in the current page space.
	 *
	 * @public
	 */
	@computed getViewportPageBounds() {
		const { w, h } = this.getViewportScreenBounds()
		const { x: cx, y: cy, z: cz } = this.getCamera()
		return new Box(-cx, -cy, w / cz, h / cz)
	}

	/**
	 * Update the viewport screen bounds. This should be called when the viewport's screen bounds change.
	 *
	 * @example
	 * ```ts
	 * editor.updateViewportScreenBounds(myBounds)
	 * editor.updateViewportScreenBounds(myBounds, { center: true })
	 * ```
	 *
	 * @param screenBounds - The new screen bounds of the viewport.
	 * @param center - Whether to preserve the viewport page center as the viewport changes.
	 *
	 * @public
	 */
	updateViewportScreenBounds(screenBounds: Box | HTMLElement, center = false): this {
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

		const insets = [
			// top
			screenBounds.minY !== 0,
			// right
			!approximately(document.body.scrollWidth, screenBounds.maxX, 1),
			// bottom
			!approximately(document.body.scrollHeight, screenBounds.maxY, 1),
			// left
			screenBounds.minX !== 0,
		]

		const _willSetInitialBounds = (this.editor as any)._willSetInitialBounds
		;(this.editor as any)._willSetInitialBounds = false

		const { screenBounds: prevScreenBounds, insets: prevInsets } = this.editor.getInstanceState()
		if (screenBounds.equals(prevScreenBounds) && insets.every((v, i) => v === prevInsets[i])) {
			// nothing to do
			return this
		}

		if (_willSetInitialBounds) {
			// If we have just received the initial bounds, don't center the camera.
			this.editor.updateInstanceState({ screenBounds: screenBounds.toJson(), insets })
			this.editor.emit('resize', screenBounds.toJson())
			this.setCamera(this.getCamera())
		} else {
			if (center && !this.editor.getInstanceState().followingUserId) {
				// Get the page center before the change, make the change, and restore it
				const before = this.getViewportPageBounds().center
				this.editor.updateInstanceState({ screenBounds: screenBounds.toJson(), insets })
				this.editor.emit('resize', screenBounds.toJson())
				this.centerOnPoint(before)
			} else {
				// Otherwise,
				this.editor.updateInstanceState({ screenBounds: screenBounds.toJson(), insets })
				this.editor.emit('resize', screenBounds.toJson())
				this._setCamera(Vec.From({ ...this.getCamera() }))
			}
		}

		return this
	}

	// Coordinate transformations

	/**
	 * Convert a point in screen space to a point in the current page space.
	 *
	 * @example
	 * ```ts
	 * editor.screenToPage({ x: 100, y: 100 })
	 * ```
	 *
	 * @param point - The point in screen space.
	 *
	 * @public
	 */
	screenToPage(point: VecLike) {
		const { screenBounds } = this.editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!
		const { x: cx, y: cy, z: cz = 1 } = this.getCamera()
		return new Vec(
			(point.x - screenBounds.x) / cz - cx,
			(point.y - screenBounds.y) / cz - cy,
			point.z ?? 0.5
		)
	}

	/**
	 * Convert a point in the current page space to a point in current screen space.
	 *
	 * @example
	 * ```ts
	 * editor.pageToScreen({ x: 100, y: 100 })
	 * ```
	 *
	 * @param point - The point in page space.
	 *
	 * @public
	 */
	pageToScreen(point: VecLike) {
		const { screenBounds } = this.editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!
		const { x: cx, y: cy, z: cz = 1 } = this.getCamera()
		return new Vec(
			(point.x + cx) * cz + screenBounds.x,
			(point.y + cy) * cz + screenBounds.y,
			point.z ?? 0.5
		)
	}

	/**
	 * Convert a point in the current page space to a point in current viewport space.
	 *
	 * @example
	 * ```ts
	 * editor.pageToViewport({ x: 100, y: 100 })
	 * ```
	 *
	 * @param point - The point in page space.
	 *
	 * @public
	 */
	pageToViewport(point: VecLike) {
		const { x: cx, y: cy, z: cz = 1 } = this.getCamera()
		return new Vec((point.x + cx) * cz, (point.y + cy) * cz, point.z ?? 0.5)
	}

	// Camera state

	/**
	 * Whether the camera is moving or idle.
	 *
	 * @example
	 * ```ts
	 * editor.getCameraState()
	 * ```
	 *
	 * @public
	 */
	getCameraState() {
		return this._cameraState.get()
	}

	/** @internal */
	_tickCameraState() {
		// always reset the timeout
		this._cameraStateTimeoutRemaining = this.editor.options.cameraMovingTimeoutMs
		// If the state is idle, then start the tick
		if (this._cameraState.__unsafe__getWithoutCapture() !== 'idle') return
		this._cameraState.set('moving')
		this._debouncedZoomLevel.set(unsafe__withoutCapture(() => this.getCamera().z))
		this.editor.on('tick', this._decayCameraStateTimeout)
	}

	/** @internal */
	_decayCameraStateTimeout(elapsed: number) {
		this._cameraStateTimeoutRemaining -= elapsed
		if (this._cameraStateTimeoutRemaining > 0) return
		this.editor.off('tick', this._decayCameraStateTimeout)
		this._cameraState.set('idle')
	}

	// Helpers

	/** @internal */
	getConstrainedCamera(
		point: VecLike,
		opts?: TLCameraMoveOptions
	): {
		x: number
		y: number
		z: number
	} {
		const currentCamera = this.getCamera()

		let { x, y, z = currentCamera.z } = point

		// If force is true, then we'll set the camera to the point regardless of
		// the camera options, so that we can handle gestures that permit elasticity
		// or decay, or animations that occur while the camera is locked.
		if (!opts?.force) {
			// Apply any adjustments based on the camera options

			const cameraOptions = this.getCameraOptions()

			const zoomMin = cameraOptions.zoomSteps[0]
			const zoomMax = last(cameraOptions.zoomSteps)!

			const vsb = this.getViewportScreenBounds()

			// If bounds are provided, then we'll keep those bounds on screen
			if (cameraOptions.constraints) {
				const { constraints } = cameraOptions

				// Clamp padding to half the viewport size on either dimension
				const py = Math.min(constraints.padding.y, vsb.w / 2)
				const px = Math.min(constraints.padding.x, vsb.h / 2)

				// Expand the bounds by the padding
				const bounds = Box.From(cameraOptions.constraints.bounds)

				// For each axis, the "natural zoom" is the zoom at
				// which the expanded bounds (with padding) would fit
				// the current viewport screen bounds. Paddings are
				// equal to screen pixels at 100%
				// The min and max zooms are factors of the smaller natural zoom axis
				const { zx, zy } = this._getCameraFitXFitY(cameraOptions)
				const baseZoom = Math.min(zx, zy)

				const maxZ = zoomMax * baseZoom
				const minZ = zoomMin * baseZoom

				if (opts?.reset) {
					z = this.getInitialZoom()
				}

				if (z < minZ || z > maxZ) {
					// We're trying to zoom out past the minimum zoom level,
					// or in past the maximum zoom level, so stop the camera
					// but keep the current center
					const { x: cx, y: cy, z: cz } = currentCamera
					const cxA = -cx + vsb.w / cz / 2
					const cyA = -cy + vsb.h / cz / 2
					z = clamp(z, minZ, maxZ)
					const cxB = -cx + vsb.w / z / 2
					const cyB = -cy + vsb.h / z / 2
					x = cx + cxB - cxA
					y = cy + cyB - cyA
				}

				// Calculate available space
				const minX = px / z - bounds.x
				const minY = py / z - bounds.y
				const freeW = (vsb.w - px * 2) / z - bounds.w
				const freeH = (vsb.h - py * 2) / z - bounds.h
				const originX = minX + freeW * constraints.origin.x
				const originY = minY + freeH * constraints.origin.y

				const behaviorX =
					typeof constraints.behavior === 'string' ? constraints.behavior : constraints.behavior.x
				const behaviorY =
					typeof constraints.behavior === 'string' ? constraints.behavior : constraints.behavior.y

				// x axis

				if (opts?.reset) {
					// Reset the camera according to the origin
					x = originX
					y = originY
				} else {
					// Apply constraints to the camera
					switch (behaviorX) {
						case 'fixed': {
							// Center according to the origin
							x = originX
							break
						}
						case 'contain': {
							// When below fit zoom, center the camera
							if (z < zx) x = originX
							// When above fit zoom, keep the bounds within padding distance of the viewport edge
							else x = clamp(x, minX + freeW, minX)
							break
						}
						case 'inside': {
							// When below fit zoom, constrain the camera so that the bounds stay completely within the viewport
							if (z < zx) x = clamp(x, minX, (vsb.w - px) / z - bounds.w)
							// When above fit zoom, keep the bounds within padding distance of the viewport edge
							else x = clamp(x, minX + freeW, minX)
							break
						}
						case 'outside': {
							// Constrain the camera so that the bounds never leaves the viewport
							x = clamp(x, px / z - bounds.w, (vsb.w - px) / z)
							break
						}
						case 'free': {
							// noop, use whatever x is provided
							break
						}
						default: {
							throw exhaustiveSwitchError(behaviorX)
						}
					}

					// y axis

					switch (behaviorY) {
						case 'fixed': {
							y = originY
							break
						}
						case 'contain': {
							if (z < zy) y = originY
							else y = clamp(y, minY + freeH, minY)
							break
						}
						case 'inside': {
							if (z < zy) y = clamp(y, minY, (vsb.h - py) / z - bounds.h)
							else y = clamp(y, minY + freeH, minY)
							break
						}
						case 'outside': {
							y = clamp(y, py / z - bounds.h, (vsb.h - py) / z)
							break
						}
						case 'free': {
							// noop, use whatever x is provided
							break
						}
						default: {
							throw exhaustiveSwitchError(behaviorY)
						}
					}
				}
			} else {
				// constrain the zoom, preserving the center
				if (z > zoomMax || z < zoomMin) {
					const { x: cx, y: cy, z: cz } = currentCamera
					z = clamp(z, zoomMin, zoomMax)
					x = cx + (-cx + vsb.w / z / 2) - (-cx + vsb.w / cz / 2)
					y = cy + (-cy + vsb.h / z / 2) - (-cy + vsb.h / cz / 2)
				}
			}
		}

		return { x, y, z }
	}

	/** @internal */
	_zoomToFitPageContentAt100Percent() {
		const bounds = this.editor.getCurrentPageBounds()
		if (bounds) {
			this.zoomToBounds(bounds, { immediate: true, targetZoom: this.getBaseZoom() })
		}
	}

	/** @internal */
	_getCameraFitXFitY(cameraOptions: TLCameraOptions) {
		if (!cameraOptions.constraints) throw Error('Should have constraints here')
		const {
			padding: { x: px, y: py },
		} = cameraOptions.constraints
		const vsb = this.getViewportScreenBounds()
		const bounds = Box.From(cameraOptions.constraints.bounds)
		const zx = (vsb.w - px * 2) / bounds.w
		const zy = (vsb.h - py * 2) / bounds.h
		return { zx, zy }
	}
}
