import { atom, computed, transact } from '@tldraw/state'
import { CameraRecordType, TLINSTANCE_ID, TLShapeId, Vec3Model } from '@tldraw/tlschema'
import { compact } from '@tldraw/utils'
import {
	CAMERA_MAX_RENDERING_INTERVAL,
	CAMERA_MOVING_TIMEOUT,
	COLLABORATOR_IDLE_TIMEOUT,
	DEFAULT_ANIMATION_OPTIONS,
	FOLLOW_CHASE_PAN_SNAP,
	FOLLOW_CHASE_PAN_UNSNAP,
	FOLLOW_CHASE_PROPORTION,
	FOLLOW_CHASE_ZOOM_SNAP,
	FOLLOW_CHASE_ZOOM_UNSNAP,
	INTERNAL_POINTER_IDS,
	MAX_ZOOM,
	MIN_ZOOM,
	ZOOMS,
} from '../../constants'
import { Box } from '../../primitives/Box'
import { Vec, VecLike } from '../../primitives/Vec'
import { EASINGS } from '../../primitives/easings'
import { clamp } from '../../primitives/utils'
import { Editor, TLAnimationOptions } from '../Editor'

/** @public */
export class CameraManager {
	constructor(private readonly editor: Editor) {}

	/** @internal */
	@computed private getId() {
		return CameraRecordType.createId(this.editor.getCurrentPageId())
	}

	@computed canMove() {
		return this.editor.getInstanceState().canMoveCamera
	}

	/**
	 * The current camera record.
	 *
	 * @public
	 */
	@computed get() {
		return this.editor.store.get(this.getId())!
	}

	@computed getZoom() {
		return this.get().z
	}

	private _set(point: Vec3Model) {
		const currentCamera = this.get()

		if (currentCamera.x === point.x && currentCamera.y === point.y && currentCamera.z === point.z) {
			return
		}

		this.editor.batch(() => {
			this.editor.store.put([{ ...currentCamera, ...point }]) // include id and meta here

			// Dispatch a new pointer move because the pointer's page will have changed
			// (its screen position will compute to a new page position given the new camera position)
			const { currentScreenPoint } = this.editor.inputs
			const { screenBounds } = this.editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!

			this.editor.dispatch({
				type: 'pointer',
				target: 'canvas',
				name: 'pointer_move',
				// weird but true: we need to put the screen point back into client space
				point: Vec.AddXY(currentScreenPoint, screenBounds.x, screenBounds.y),
				pointerId: INTERNAL_POINTER_IDS.CAMERA_MOVE,
				ctrlKey: this.editor.inputs.ctrlKey,
				altKey: this.editor.inputs.altKey,
				shiftKey: this.editor.inputs.shiftKey,
				button: 0,
				isPen: this.editor.getInstanceState().isPenMode ?? false,
			})

			this._tickCameraState()
		})
	}

	/**
	 * Set the current camera.
	 *
	 * @example
	 * ```ts
	 * editor.camera.set({ x: 0, y: 0})
	 * editor.camera.set({ x: 0, y: 0, z: 1.5})
	 * editor.camera.set({ x: 0, y: 0, z: 1.5}, { duration: 1000, easing: (t) => t * t })
	 * ```
	 *
	 * @param point - The new camera position.
	 * @param animation - Options for an animation.
	 *
	 * @public
	 */
	set(point: VecLike, animation?: TLAnimationOptions): this {
		const x = Number.isFinite(point.x) ? point.x : 0
		const y = Number.isFinite(point.y) ? point.y : 0
		const z = Number.isFinite(point.z) ? point.z! : this.getZoom()

		// Stop any camera animations
		this.stopAnimation()

		// Stop following any user
		if (this.editor.getInstanceState().followingUserId) {
			this.editor.camera.stopFollowingUser()
		}

		if (animation) {
			const { width, height } = this.editor.getViewportScreenBounds()
			this._animateToViewport(new Box(-x, -y, width / z, height / z), animation)
		} else {
			this._set({ x, y, z })
		}

		return this
	}

	/**
	 * Center the camera on a point (in the current page space).
	 *
	 * @example
	 * ```ts
	 * editor.camera.centerOnPoint({ x: 100, y: 100 })
	 * editor.camera.centerOnPoint({ x: 100, y: 100 }, { duration: 200 })
	 * ```
	 *
	 * @param point - The point in the current page space to center on.
	 * @param animation - The options for an animation.
	 *
	 * @public
	 */
	centerOnPoint(point: VecLike, animation?: TLAnimationOptions): this {
		if (!this.canMove()) return this

		const { width: pw, height: ph } = this.editor.getViewportPageBounds()

		this.set({ x: -(point.x - pw / 2), y: -(point.y - ph / 2), z: this.get().z }, animation)
		return this
	}

	/**
	 * Move the camera to the nearest content.
	 *
	 * @example
	 * ```ts
	 * editor.camera.zoomToContent()
	 * editor.camera.zoomToContent({ duration: 200 })
	 * ```
	 *
	 * @param opts - The options for an animation.
	 *
	 * @public
	 */
	zoomToContent(): this {
		const bounds = this.editor.getSelectionPageBounds() ?? this.editor.getCurrentPageBounds()

		if (bounds) {
			this.zoomToBounds(bounds, { targetZoom: Math.min(1, this.getZoom()), duration: 220 })
		}

		return this
	}

	/**
	 * Zoom the camera to fit the current page's content in the viewport.
	 *
	 * @example
	 * ```ts
	 * editor.camera.zoomToFit()
	 * editor.camera.zoomToFit({ duration: 200 })
	 * ```
	 *
	 * @param animation - The options for an animation.
	 *
	 * @public
	 */
	zoomToFit(animation?: TLAnimationOptions): this {
		if (!this.canMove()) return this

		const pageBounds = this.editor.getCurrentPageBounds()
		if (!pageBounds) return this

		this.zoomToBounds(pageBounds, animation)

		return this
	}

	/**
	 * Set the zoom back to 100%.
	 *
	 * @example
	 * ```ts
	 * editor.camera.resetZoom()
	 * editor.camera.resetZoom(editor.getViewportScreenCenter(), { duration: 200 })
	 * editor.camera.resetZoom(editor.getViewportScreenCenter(), { duration: 200 })
	 * ```
	 *
	 * @param point - The screen point to zoom out on. Defaults to the viewport screen center.
	 * @param animation - The options for an animation.
	 *
	 * @public
	 */
	resetZoom(point = this.editor.getViewportScreenCenter(), animation?: TLAnimationOptions): this {
		if (!this.canMove()) return this

		const { x: cx, y: cy, z: cz } = this.get()
		const { x, y } = point
		this.set(
			{ x: cx + (x / 1 - x) - (x / cz - x), y: cy + (y / 1 - y) - (y / cz - y), z: 1 },
			animation
		)

		return this
	}

	/**
	 * Zoom the camera in.
	 *
	 * @example
	 * ```ts
	 * editor.camera.zoomIn()
	 * editor.camera.zoomIn(editor.getViewportScreenCenter(), { duration: 120 })
	 * editor.camera.zoomIn(editor.inputs.currentScreenPoint, { duration: 120 })
	 * ```
	 *
	 * @param animation - The options for an animation.
	 *
	 * @public
	 */
	zoomIn(point = this.editor.getViewportScreenCenter(), animation?: TLAnimationOptions): this {
		if (!this.canMove()) return this

		const { x: cx, y: cy, z: cz } = this.get()

		let zoom = MAX_ZOOM

		for (let i = 1; i < ZOOMS.length; i++) {
			const z1 = ZOOMS[i - 1]
			const z2 = ZOOMS[i]
			if (z2 - cz <= (z2 - z1) / 2) continue
			zoom = z2
			break
		}

		const { x, y } = point
		this.set(
			{ x: cx + (x / zoom - x) - (x / cz - x), y: cy + (y / zoom - y) - (y / cz - y), z: zoom },
			animation
		)

		return this
	}

	/**
	 * Zoom the camera out.
	 *
	 * @example
	 * ```ts
	 * editor.camera.zoomOut()
	 * editor.camera.zoomOut(editor.getViewportScreenCenter(), { duration: 120 })
	 * editor.camera.zoomOut(editor.inputs.currentScreenPoint, { duration: 120 })
	 * ```
	 *
	 * @param animation - The options for an animation.
	 *
	 * @public
	 */
	zoomOut(point = this.editor.getViewportScreenCenter(), animation?: TLAnimationOptions): this {
		if (!this.canMove()) return this

		const { x: cx, y: cy, z: cz } = this.get()

		let zoom = MIN_ZOOM

		for (let i = ZOOMS.length - 1; i > 0; i--) {
			const z1 = ZOOMS[i - 1]
			const z2 = ZOOMS[i]
			if (z2 - cz >= (z2 - z1) / 2) continue
			zoom = z1
			break
		}

		const { x, y } = point

		this.set(
			{
				x: cx + (x / zoom - x) - (x / cz - x),
				y: cy + (y / zoom - y) - (y / cz - y),
				z: zoom,
			},
			animation
		)

		return this
	}

	/**
	 * Zoom the camera to fit the current selection in the viewport.
	 *
	 * @example
	 * ```ts
	 * editor.zoomToSelection()
	 * ```
	 *
	 * @param animation - The options for an animation.
	 *
	 * @public
	 */
	zoomToSelection(animation?: TLAnimationOptions): this {
		if (!this.canMove()) return this

		const selectionPageBounds = this.editor.getSelectionPageBounds()
		if (!selectionPageBounds) return this

		this.zoomToBounds(selectionPageBounds, {
			targetZoom: Math.max(1, this.getZoom()),
			...animation,
		})

		return this
	}

	/**
	 * Pan or pan/zoom the selected ids into view. This method tries to not change the zoom if possible.
	 *
	 * @param ids - The ids of the shapes to pan and zoom into view.
	 * @param animation - The options for an animation.
	 *
	 * @public
	 */
	panZoomIntoView(ids: TLShapeId[], animation?: TLAnimationOptions): this {
		if (!this.canMove()) return this

		if (ids.length <= 0) return this
		const selectionBounds = Box.Common(compact(ids.map((id) => this.editor.getShapePageBounds(id))))

		const viewportPageBounds = this.editor.getViewportPageBounds()

		if (viewportPageBounds.h < selectionBounds.h || viewportPageBounds.w < selectionBounds.w) {
			this.zoomToBounds(selectionBounds, { targetZoom: this.getZoom(), ...animation })

			return this
		} else {
			const insetViewport = this.editor
				.getViewportPageBounds()
				.clone()
				.expandBy(-32 / this.getZoom())

			let offsetX = 0
			let offsetY = 0
			if (insetViewport.maxY < selectionBounds.maxY) {
				// off bottom
				offsetY = insetViewport.maxY - selectionBounds.maxY
			} else if (insetViewport.minY > selectionBounds.minY) {
				// off top
				offsetY = insetViewport.minY - selectionBounds.minY
			} else {
				// inside y-bounds
			}

			if (insetViewport.maxX < selectionBounds.maxX) {
				// off right
				offsetX = insetViewport.maxX - selectionBounds.maxX
			} else if (insetViewport.minX > selectionBounds.minX) {
				// off left
				offsetX = insetViewport.minX - selectionBounds.minX
			} else {
				// inside x-bounds
			}

			const camera = this.get()
			this.set({ x: camera.x + offsetX, y: camera.y + offsetY, z: camera.z }, animation)
		}

		return this
	}

	/**
	 * Zoom the camera to fit a bounding box (in the current page space).
	 *
	 * @example
	 * ```ts
	 * editor.camera.zoomToBounds(myBounds)
	 * editor.camera.zoomToBounds(myBounds)
	 * editor.camera.zoomToBounds(myBounds, { duration: 100 })
	 * editor.camera.zoomToBounds(myBounds, { inset: 0, targetZoom: 1 })
	 * ```
	 *
	 * @param bounds - The bounding box.
	 * @param options - The options for an animation, target zoom, or custom inset amount.
	 *
	 * @public
	 */
	zoomToBounds(
		bounds: Box,
		opts?: { targetZoom?: number; inset?: number } & TLAnimationOptions
	): this {
		if (!this.canMove()) return this

		const viewportScreenBounds = this.editor.getViewportScreenBounds()

		const inset = opts?.inset ?? Math.min(256, viewportScreenBounds.width * 0.28)

		let zoom = clamp(
			Math.min(
				(viewportScreenBounds.width - inset) / bounds.width,
				(viewportScreenBounds.height - inset) / bounds.height
			),
			MIN_ZOOM,
			MAX_ZOOM
		)

		if (opts?.targetZoom !== undefined) {
			zoom = Math.min(opts.targetZoom, zoom)
		}

		this.set(
			{
				x: -bounds.minX + (viewportScreenBounds.width - bounds.width * zoom) / 2 / zoom,
				y: -bounds.minY + (viewportScreenBounds.height - bounds.height * zoom) / 2 / zoom,
				z: zoom,
			},
			opts
		)

		return this
	}

	/**
	 * Pan the camera.
	 *
	 * @example
	 * ```ts
	 * editor.camera.pan({ x: 100, y: 100 })
	 * editor.camera.pan({ x: 100, y: 100 }, { duration: 1000 })
	 * ```
	 *
	 * @param offset - The offset in the current page space.
	 * @param animation - The animation options.
	 */
	pan(offset: VecLike, animation?: TLAnimationOptions): this {
		if (!this.canMove()) return this
		const { x: cx, y: cy, z: cz } = this.get()
		this.set({ x: cx + offset.x / cz, y: cy + offset.y / cz, z: cz }, animation)
		return this
	}

	/**
	 * Stop the current camera animation, if any.
	 *
	 * @public
	 */
	stopAnimation(): this {
		this.editor.emit('stop-camera-animation')
		return this
	}

	/** @internal */
	private _animateToViewport(targetViewportPage: Box, opts = {} as TLAnimationOptions) {
		const { duration: rawDuration = 0, easing = EASINGS.easeInOutCubic } = opts
		const animationSpeed = this.editor.user.getAnimationSpeed()
		const viewportPageBounds = this.editor.getViewportPageBounds()

		// If we have an existing animation, then stop it
		this.stopAnimation()

		// also stop following any user
		if (this.editor.getInstanceState().followingUserId) {
			this.editor.camera.stopFollowingUser()
		}

		if (rawDuration === 0 || animationSpeed === 0) {
			// If we have no animation, then skip the animation and just set the camera
			this._set({
				x: -targetViewportPage.x,
				y: -targetViewportPage.y,
				z: this.editor.getViewportScreenBounds().width / targetViewportPage.width,
			})
			return
		}

		let elapsed = 0
		const duration = rawDuration / animationSpeed
		const start = viewportPageBounds.clone()
		const end = targetViewportPage.clone()

		const onTick = (ms: number) => {
			elapsed += ms

			if (elapsed > duration) {
				this._set({
					x: -end.x,
					y: -end.y,
					z: this.editor.getViewportScreenBounds().width / end.width,
				})
				onCancel()
				return
			}

			const remaining = duration - elapsed
			const t = easing(1 - remaining / duration)

			const left = start.minX + (end.minX - start.minX) * t
			const top = start.minY + (end.minY - start.minY) * t
			const right = start.maxX + (end.maxX - start.maxX) * t

			this._set({
				x: -left,
				y: -top,
				z: this.editor.getViewportScreenBounds().width / (right - left),
			})
		}

		const onCancel = () => {
			this.editor.removeListener('tick', onTick)
			this.editor.removeListener('stop-camera-animation', onCancel)
		}

		// On each tick, animate the viewport
		this.editor.addListener('tick', onTick)
		this.editor.once('stop-camera-animation', onCancel)
	}

	/**
	 * Slide the camera in a certain direction.
	 *
	 * @param opts - Options for the slide
	 * @public
	 */
	slide(opts: {
		speed: number
		direction: VecLike
		friction: number
		speedThreshold?: number
	}): this {
		if (!this.canMove()) return this

		this.stopAnimation()

		const animationSpeed = this.editor.user.getAnimationSpeed()
		if (animationSpeed === 0) return this

		const { speed, friction, direction, speedThreshold = 0.01 } = opts
		let currentSpeed = Math.min(speed, 1)

		const onTick = (elapsed: number) => {
			const { x: cx, y: cy, z: cz } = this.get()
			const movementVec = Vec.Mul(direction, (currentSpeed * elapsed) / cz)

			// Apply friction
			currentSpeed *= 1 - friction
			if (currentSpeed < speedThreshold) {
				onCancel()
			} else {
				this._set({ x: cx + movementVec.x, y: cy + movementVec.y, z: cz })
			}
		}

		const onCancel = () => {
			this.editor.removeListener('tick', onTick)
			this.editor.removeListener('stop-camera-animation', onCancel)
		}

		this.editor.addListener('tick', onTick)
		this.editor.once('stop-camera-animation', onCancel)

		return this
	}

	/**
	 * Animate the camera to a user's cursor position.
	 * This also briefly show the user's cursor if it's not currently visible.
	 *
	 * @param userId - The id of the user to aniamte to.
	 * @public
	 */
	animateToUser(userId: string): this {
		const presences = this.editor.store.query.records('instance_presence', () => ({
			userId: { eq: userId },
		}))

		const presence = [...presences.get()]
			.sort((a, b) => {
				return a.lastActivityTimestamp - b.lastActivityTimestamp
			})
			.pop()

		if (!presence) return this

		this.editor.batch(() => {
			// If we're following someone, stop following them
			if (this.editor.getInstanceState().followingUserId !== null) {
				this.editor.camera.stopFollowingUser()
			}

			// If we're not on the same page, move to the page they're on
			const isOnSamePage = presence.currentPageId === this.editor.getCurrentPageId()
			if (!isOnSamePage) {
				this.editor.setCurrentPage(presence.currentPageId)
			}

			// Only animate the camera if the user is on the same page as us
			const options = isOnSamePage ? { duration: 500 } : undefined

			this.centerOnPoint(presence.cursor, options)

			// Highlight the user's cursor
			const { highlightedUserIds } = this.editor.getInstanceState()
			this.editor.updateInstanceState({ highlightedUserIds: [...highlightedUserIds, userId] })

			// Unhighlight the user's cursor after a few seconds
			setTimeout(() => {
				const highlightedUserIds = [...this.editor.getInstanceState().highlightedUserIds]
				const index = highlightedUserIds.indexOf(userId)
				if (index < 0) return
				highlightedUserIds.splice(index, 1)
				this.editor.updateInstanceState({ highlightedUserIds })
			}, COLLABORATOR_IDLE_TIMEOUT)
		})

		return this
	}

	/**
	 * Animate the camera to a shape.
	 *
	 * @public
	 */
	animateToShape(shapeId: TLShapeId, opts: TLAnimationOptions = DEFAULT_ANIMATION_OPTIONS): this {
		if (!this.canMove()) return this

		const activeArea = this.editor.getViewportScreenBounds().clone().expandBy(-32)
		const viewportAspectRatio = activeArea.width / activeArea.height

		const shapePageBounds = this.editor.getShapePageBounds(shapeId)

		if (!shapePageBounds) return this

		const shapeAspectRatio = shapePageBounds.width / shapePageBounds.height

		const targetViewportPage = shapePageBounds.clone()

		const z = shapePageBounds.width / activeArea.width
		targetViewportPage.width += (activeArea.minX + activeArea.maxX) * z
		targetViewportPage.height += (activeArea.minY + activeArea.maxY) * z
		targetViewportPage.x -= activeArea.minX * z
		targetViewportPage.y -= activeArea.minY * z

		if (shapeAspectRatio > viewportAspectRatio) {
			targetViewportPage.height = shapePageBounds.width / viewportAspectRatio
			targetViewportPage.y -= (targetViewportPage.height - shapePageBounds.height) / 2
		} else {
			targetViewportPage.width = shapePageBounds.height * viewportAspectRatio
			targetViewportPage.x -= (targetViewportPage.width - shapePageBounds.width) / 2
		}

		this._animateToViewport(targetViewportPage, opts)
		return this
	}

	// Following

	/**
	 * Start viewport-following a user.
	 *
	 * @param userId - The id of the user to follow.
	 *
	 * @public
	 */
	startFollowingUser(userId: string): this {
		const leaderPresences = this.editor.store.query.records('instance_presence', () => ({
			userId: { eq: userId },
		}))

		const thisUserId = this.editor.user.getId()

		if (!thisUserId) {
			console.warn('You should set the userId for the current instance before following a user')
		}

		// If the leader is following us, then we can't follow them
		if (leaderPresences.get().some((p) => p.followingUserId === thisUserId)) {
			return this
		}

		transact(() => {
			this.stopFollowingUser()

			this.editor.updateInstanceState({ followingUserId: userId }, { ephemeral: true })
		})

		const onCancel = () => {
			this.editor.removeListener('frame', onTick)
			this.editor.removeListener('stop-following', onCancel)
		}

		let isCaughtUp = false

		const onTick = () => {
			// Stop following if we can't find the user
			const leaderPresence = [...leaderPresences.get()]
				.sort((a, b) => {
					return a.lastActivityTimestamp - b.lastActivityTimestamp
				})
				.pop()
			if (!leaderPresence) {
				this.stopFollowingUser()
				return
			}

			// Change page if leader is on a different page
			const isOnSamePage = leaderPresence.currentPageId === this.editor.getCurrentPageId()
			const chaseProportion = isOnSamePage ? FOLLOW_CHASE_PROPORTION : 1
			if (!isOnSamePage) {
				this.stopFollowingUser()
				this.editor.setCurrentPage(leaderPresence.currentPageId)
				this.startFollowingUser(userId)
				return
			}

			// Get the bounds of the follower (me) and the leader (them)
			const { center, width, height } = this.editor.getViewportPageBounds()
			const leaderScreen = Box.From(leaderPresence.screenBounds)
			const leaderWidth = leaderScreen.width / leaderPresence.camera.z
			const leaderHeight = leaderScreen.height / leaderPresence.camera.z
			const leaderCenter = new Vec(
				leaderWidth / 2 - leaderPresence.camera.x,
				leaderHeight / 2 - leaderPresence.camera.y
			)

			// At this point, let's check if we're following someone who's following us.
			// If so, we can't try to contain their entire viewport
			// because that would become a feedback loop where we zoom, they zoom, etc.
			const isFollowingFollower = leaderPresence.followingUserId === thisUserId

			// Figure out how much to zoom
			const desiredWidth = width + (leaderWidth - width) * chaseProportion
			const desiredHeight = height + (leaderHeight - height) * chaseProportion
			const ratio = !isFollowingFollower
				? Math.min(width / desiredWidth, height / desiredHeight)
				: height / desiredHeight

			const targetZoom = clamp(this.getZoom() * ratio, MIN_ZOOM, MAX_ZOOM)
			const targetWidth = this.editor.getViewportScreenBounds().w / targetZoom
			const targetHeight = this.editor.getViewportScreenBounds().h / targetZoom

			// Figure out where to move the camera
			const displacement = leaderCenter.sub(center)
			const targetCenter = Vec.Add(center, Vec.Mul(displacement, chaseProportion))

			// Now let's assess whether we've caught up to the leader or not
			const distance = Vec.Sub(targetCenter, center).len()
			const zoomChange = Math.abs(targetZoom - this.getZoom())

			// If we're chasing the leader...
			// Stop chasing if we're close enough
			if (distance < FOLLOW_CHASE_PAN_SNAP && zoomChange < FOLLOW_CHASE_ZOOM_SNAP) {
				isCaughtUp = true
				return
			}

			// If we're already caught up with the leader...
			// Only start moving again if we're far enough away
			if (
				isCaughtUp &&
				distance < FOLLOW_CHASE_PAN_UNSNAP &&
				zoomChange < FOLLOW_CHASE_ZOOM_UNSNAP
			) {
				return
			}

			// Update the camera!
			isCaughtUp = false
			this.stopAnimation()
			this._set({
				x: -(targetCenter.x - targetWidth / 2),
				y: -(targetCenter.y - targetHeight / 2),
				z: targetZoom,
			})
		}

		this.editor.once('stop-following', onCancel)
		this.editor.addListener('frame', onTick)

		return this
	}

	/**
	 * Stop viewport-following a user.
	 *
	 * @public
	 */
	stopFollowingUser(): this {
		this.editor.updateInstanceState({ followingUserId: null }, { ephemeral: true })
		this.editor.emit('stop-following')
		return this
	}

	// Camera state
	private _state = atom('camera state', 'idle' as 'idle' | 'moving')

	/**
	 * Whether the camera is moving or idle.
	 *
	 * @public
	 */
	getState() {
		return this._state.get()
	}

	// Camera state does two things: first, it allows us to subscribe to whether
	// the camera is moving or not; and second, it allows us to update the rendering
	// shapes on the canvas. Changing the rendering shapes may cause shapes to
	// unmount / remount in the DOM, which is expensive; and computing visibility is
	// also expensive in large projects. For this reason, we use a second bounding
	// box just for rendering, and we only update after the camera stops moving.

	private _cameraStateTimeoutRemaining = 0
	private _lastUpdateRenderingBoundsTimestamp = Date.now()

	private _decayCameraStateTimeout = (elapsed: number) => {
		this._cameraStateTimeoutRemaining -= elapsed

		if (this._cameraStateTimeoutRemaining <= 0) {
			this.editor.off('tick', this._decayCameraStateTimeout)
			this._state.set('idle')
			this.editor.updateRenderingBounds()
		}
	}

	/** @internal */
	_tickCameraState = () => {
		// always reset the timeout
		this._cameraStateTimeoutRemaining = CAMERA_MOVING_TIMEOUT

		const now = Date.now()

		// If the state is idle, then start the tick
		if (this._state.__unsafe__getWithoutCapture() === 'idle') {
			this._lastUpdateRenderingBoundsTimestamp = now // don't render right away
			this._state.set('moving')
			this.editor.on('tick', this._decayCameraStateTimeout)
		} else {
			if (now - this._lastUpdateRenderingBoundsTimestamp > CAMERA_MAX_RENDERING_INTERVAL) {
				this.editor.updateRenderingBounds()
			}
		}
	}
}
