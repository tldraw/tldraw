import { atom, computed, unsafe__withoutCapture } from '@tldraw/state'
import { AtomSet } from '@tldraw/store'
import { TLINSTANCE_ID, TLPOINTER_ID } from '@tldraw/tlschema'
import { INTERNAL_POINTER_IDS } from '../../../constants'
import { Vec } from '../../../primitives/Vec'
import { isAccelKey } from '../../../utils/keyboard'
import type { Editor } from '../../Editor'
import { TLPinchEventInfo, TLPointerEventInfo, TLWheelEventInfo } from '../../types/event-types'

const POINTER_VELOCITY_REFERENCE_INTERVAL_MS = 16
const POINTER_VELOCITY_REFERENCE_SMOOTHING = 0.5

/**
 * The phase of the multi-touch / pinch gesture lifecycle tracked by
 * {@link InputsManager.getGesturePhase}.
 * @public
 */
export type TLGesturePhase = 'idle' | 'multi-touch' | 'pinching'

/**
 * The current pointer / pan interaction, modelled as one explicit state instead
 * of the overlapping `isPointing` / `isDragging` / `isRightPointing` /
 * `isPanning` / `isSpacebarPanning` flags. The boolean getters are derived from
 * it.
 *
 * - `'idle'` — no pointer interaction.
 * - `'pointing'` — a pointer button is down; `dragging` once it passes the drag
 *   threshold, `rightUndecided` while a right button is down and hasn't yet been
 *   classified as a right-click or the start of a right-drag pan.
 * - `'panning'` — the camera is being panned (`via` spacebar, the middle mouse
 *   button, or a right-drag); `pointerDown` tracks whether a pointer button is
 *   also held, which is what keeps `isPointing` true during a middle/right-drag
 *   pan.
 *
 * @public
 */
export type TLInteractionState =
	| { name: 'idle' }
	| { name: 'pointing'; dragging: boolean; rightUndecided: boolean }
	| { name: 'panning'; via: 'spacebar' | 'middle' | 'right'; pointerDown: boolean }

/** @public */
export class InputsManager {
	constructor(private readonly editor: Editor) {}

	private _originPagePoint = atom<Vec>('originPagePoint', new Vec())
	/**
	 * The most recent pointer down's position in the current page space.
	 */
	getOriginPagePoint() {
		return this._originPagePoint.get()
	}
	/**
	 * @deprecated Use `getOriginPagePoint()` instead.
	 */
	// eslint-disable-next-line tldraw/no-setter-getter
	get originPagePoint() {
		return this.getOriginPagePoint()
	}

	private _originScreenPoint = atom<Vec>('originScreenPoint', new Vec())
	/**
	 * The most recent pointer down's position in screen space.
	 */
	getOriginScreenPoint() {
		return this._originScreenPoint.get()
	}
	/**
	 * @deprecated Use `getOriginScreenPoint()` instead.
	 */
	// eslint-disable-next-line tldraw/no-setter-getter
	get originScreenPoint() {
		return this.getOriginScreenPoint()
	}

	private _previousPagePoint = atom<Vec>('previousPagePoint', new Vec())
	/**
	 * The previous pointer position in the current page space.
	 */
	getPreviousPagePoint() {
		return this._previousPagePoint.get()
	}
	/**
	 * @deprecated Use `getPreviousPagePoint()` instead.
	 */
	// eslint-disable-next-line tldraw/no-setter-getter
	get previousPagePoint() {
		return this.getPreviousPagePoint()
	}

	private _previousScreenPoint = atom<Vec>('previousScreenPoint', new Vec())
	/**
	 * The previous pointer position in screen space.
	 */
	getPreviousScreenPoint() {
		return this._previousScreenPoint.get()
	}
	/**
	 * @deprecated Use `getPreviousScreenPoint()` instead.
	 */
	// eslint-disable-next-line tldraw/no-setter-getter
	get previousScreenPoint() {
		return this.getPreviousScreenPoint()
	}

	private _currentPagePoint = atom<Vec>('currentPagePoint', new Vec())
	/**
	 * The most recent pointer position in the current page space.
	 */
	getCurrentPagePoint() {
		return this._currentPagePoint.get()
	}
	/**
	 * @deprecated Use `getCurrentPagePoint()` instead.
	 */
	// eslint-disable-next-line tldraw/no-setter-getter
	get currentPagePoint() {
		return this.getCurrentPagePoint()
	}

	private _currentScreenPoint = atom<Vec>('currentScreenPoint', new Vec())
	/**
	 * The most recent pointer position in screen space.
	 */
	getCurrentScreenPoint() {
		return this._currentScreenPoint.get()
	}
	/**
	 * @deprecated Use `getCurrentScreenPoint()` instead.
	 */
	// eslint-disable-next-line tldraw/no-setter-getter
	get currentScreenPoint() {
		return this.getCurrentScreenPoint()
	}

	private _pointerVelocity = atom<Vec>('pointerVelocity', new Vec())
	/**
	 * Velocity of mouse pointer, in pixels per millisecond.
	 */
	getPointerVelocity() {
		return this._pointerVelocity.get()
	}
	/**
	 * @deprecated Use `getPointerVelocity()` instead.
	 */
	// eslint-disable-next-line tldraw/no-setter-getter
	get pointerVelocity() {
		return this.getPointerVelocity()
	}

	/**
	 * Normally you shouldn't need to set the pointer velocity directly, this is set by the tick manager.
	 * However, this is currently used in tests to fake pointer velocity.
	 * @param pointerVelocity - The pointer velocity.
	 * @internal
	 */
	setPointerVelocity(pointerVelocity: Vec) {
		this._pointerVelocity.set(pointerVelocity)
	}

	/**
	 * A set containing the currently pressed keys.
	 */
	readonly keys = new AtomSet<string>('keys')

	/**
	 * A set containing the currently pressed buttons.
	 */
	readonly buttons = new AtomSet<number>('buttons')

	private _isPen = atom<boolean>('isPen', false)

	/**
	 * Whether the input is from a pen.
	 */
	getIsPen() {
		return this._isPen.get()
	}
	/**
	 * @deprecated Use `getIsPen()` instead.
	 */
	// eslint-disable-next-line tldraw/no-setter-getter
	get isPen() {
		return this.getIsPen()
	}
	// eslint-disable-next-line tldraw/no-setter-getter
	set isPen(isPen: boolean) {
		this.setIsPen(isPen)
	}
	/**
	 * @param isPen - Whether the input is from a pen.
	 */
	setIsPen(isPen: boolean) {
		this._isPen.set(isPen)
	}

	private _shiftKey = atom<boolean>('shiftKey', false)
	/**
	 * Whether the shift key is currently pressed.
	 */
	getShiftKey() {
		return this._shiftKey.get()
	}
	/**
	 * @deprecated Use `getShiftKey()` instead.
	 */
	// eslint-disable-next-line tldraw/no-setter-getter
	get shiftKey() {
		return this.getShiftKey()
	}
	// eslint-disable-next-line tldraw/no-setter-getter
	set shiftKey(shiftKey: boolean) {
		this.setShiftKey(shiftKey)
	}
	/**
	 * @param shiftKey - Whether the shift key is pressed.
	 * @internal
	 */
	setShiftKey(shiftKey: boolean) {
		this._shiftKey.set(shiftKey)
	}

	private _metaKey = atom<boolean>('metaKey', false)
	/**
	 * Whether the meta key is currently pressed.
	 */
	getMetaKey() {
		return this._metaKey.get()
	}
	/**
	 * @deprecated Use `getMetaKey()` instead.
	 */
	// eslint-disable-next-line tldraw/no-setter-getter
	get metaKey() {
		return this.getMetaKey()
	}
	// eslint-disable-next-line tldraw/no-setter-getter
	set metaKey(metaKey: boolean) {
		this.setMetaKey(metaKey)
	}
	/**
	 * @param metaKey - Whether the meta key is pressed.
	 * @internal
	 */
	setMetaKey(metaKey: boolean) {
		this._metaKey.set(metaKey)
	}

	private _ctrlKey = atom<boolean>('ctrlKey', false)
	/**
	 * Whether the ctrl or command key is currently pressed.
	 */
	getCtrlKey() {
		return this._ctrlKey.get()
	}
	/**
	 * @deprecated Use `getCtrlKey()` instead.
	 */
	// eslint-disable-next-line tldraw/no-setter-getter
	get ctrlKey() {
		return this.getCtrlKey()
	}
	// eslint-disable-next-line tldraw/no-setter-getter
	set ctrlKey(ctrlKey: boolean) {
		this.setCtrlKey(ctrlKey)
	}
	/**
	 * @param ctrlKey - Whether the ctrl key is pressed.
	 * @internal
	 */
	setCtrlKey(ctrlKey: boolean) {
		this._ctrlKey.set(ctrlKey)
	}

	private _altKey = atom<boolean>('altKey', false)
	/**
	 * Whether the alt or option key is currently pressed.
	 */
	getAltKey() {
		return this._altKey.get()
	}
	/**
	 * @deprecated Use `getAltKey()` instead.
	 */
	// eslint-disable-next-line tldraw/no-setter-getter
	get altKey() {
		return this.getAltKey()
	}
	// eslint-disable-next-line tldraw/no-setter-getter
	set altKey(altKey: boolean) {
		this.setAltKey(altKey)
	}
	/**
	 * @param altKey - Whether the alt key is pressed.
	 * @internal
	 */
	setAltKey(altKey: boolean) {
		this._altKey.set(altKey)
	}

	/**
	 * Is the accelerator key (cmd on mac, ctrl elsewhere) currently pressed.
	 */
	getAccelKey() {
		return isAccelKey({ metaKey: this.getMetaKey(), ctrlKey: this.getCtrlKey() })
	}
	/**
	 * @deprecated Use `getAccelKey()` instead.
	 */
	// eslint-disable-next-line tldraw/no-setter-getter
	get accelKey() {
		return this.getAccelKey()
	}

	private _interaction = atom<TLInteractionState>('interaction', { name: 'idle' })

	/**
	 * The current pointer interaction state. `isPointing` / `isDragging` are
	 * derived from it.
	 */
	getInteraction(): TLInteractionState {
		return this._interaction.get()
	}

	/**
	 * Begin a pointer interaction (a pointer button went down). If a pan is already
	 * in progress (e.g. spacebar panning), this just records that a pointer is now
	 * down rather than discarding the pan.
	 * @internal
	 */
	beginPointing(): void {
		const interaction = this._interaction.get()
		if (interaction.name === 'panning') {
			if (!interaction.pointerDown) this._interaction.set({ ...interaction, pointerDown: true })
		} else {
			this._interaction.set({ name: 'pointing', dragging: false, rightUndecided: false })
		}
	}

	/**
	 * Set whether the current pointing interaction has passed the drag threshold.
	 * No-op when not pointing — there is no dragging without pointing.
	 * @internal
	 */
	setDragging(dragging: boolean): void {
		const interaction = this._interaction.get()
		if (interaction.name === 'pointing' && interaction.dragging !== dragging) {
			this._interaction.set({ ...interaction, dragging })
		}
	}

	/**
	 * Mark the current pointing interaction as a right button awaiting
	 * classification (right-click vs. the start of a right-drag pan).
	 * @internal
	 */
	setRightUndecided(rightUndecided: boolean): void {
		const interaction = this._interaction.get()
		if (interaction.name === 'pointing' && interaction.rightUndecided !== rightUndecided) {
			this._interaction.set({ ...interaction, rightUndecided })
		}
	}

	/**
	 * Begin panning the camera. Preserves whether a pointer button is also held, so
	 * a middle/right-drag pan keeps `isPointing` true.
	 * @internal
	 */
	beginPanning(via: 'spacebar' | 'middle' | 'right'): void {
		const interaction = this._interaction.get()
		const pointerDown =
			interaction.name === 'pointing' || (interaction.name === 'panning' && interaction.pointerDown)
		this._interaction.set({ name: 'panning', via, pointerDown })
	}

	/**
	 * Record whether a pointer button is held during a pan (e.g. cleared when the
	 * pointer lifts but a spacebar pan continues).
	 * @internal
	 */
	setPanningPointerDown(pointerDown: boolean): void {
		const interaction = this._interaction.get()
		if (interaction.name === 'panning' && interaction.pointerDown !== pointerDown) {
			this._interaction.set({ ...interaction, pointerDown })
		}
	}

	/**
	 * Stop panning. Returns to `pointing` if a pointer is still down, otherwise to
	 * `idle`.
	 * @internal
	 */
	endPanning(): void {
		const interaction = this._interaction.get()
		if (interaction.name !== 'panning') return
		this._interaction.set(
			interaction.pointerDown
				? { name: 'pointing', dragging: false, rightUndecided: false }
				: { name: 'idle' }
		)
	}

	/**
	 * End the pointer interaction (pointer up / cancel / pinch), returning to idle.
	 * @internal
	 */
	endInteraction(): void {
		this._interaction.set({ name: 'idle' })
	}

	/**
	 * Whether a pointer button is down. True during a middle/right-drag pan (a
	 * pointer is held), false during a spacebar pan with no pointer down.
	 */
	getIsPointing() {
		const interaction = this._interaction.get()
		return (
			interaction.name === 'pointing' || (interaction.name === 'panning' && interaction.pointerDown)
		)
	}
	/**
	 * @deprecated Use `getIsPointing()` instead.
	 */
	// eslint-disable-next-line tldraw/no-setter-getter
	get isPointing() {
		return this.getIsPointing()
	}
	// eslint-disable-next-line tldraw/no-setter-getter
	set isPointing(isPointing: boolean) {
		if (isPointing) {
			this.beginPointing()
		} else if (this._interaction.get().name === 'panning') {
			this.setPanningPointerDown(false)
		} else {
			this.endInteraction()
		}
	}

	/**
	 * Whether the user is dragging (a pointer is down and has passed the drag
	 * threshold).
	 */
	getIsDragging() {
		const interaction = this._interaction.get()
		return interaction.name === 'pointing' && interaction.dragging
	}
	/**
	 * Soon to be deprecated, use `getIsDragging()` instead.
	 */
	// eslint-disable-next-line tldraw/no-setter-getter
	get isDragging() {
		return this.getIsDragging()
	}
	// eslint-disable-next-line tldraw/no-setter-getter
	set isDragging(isDragging: boolean) {
		this.setIsDragging(isDragging)
	}
	/**
	 * @param isDragging - Whether the user is dragging.
	 */
	setIsDragging(isDragging: boolean) {
		this.setDragging(isDragging)
	}

	/**
	 * Whether the user is right-click pointing (a right button is down and hasn't
	 * yet been classified as a right-click or the start of a right-drag pan).
	 */
	getIsRightPointing() {
		const interaction = this._interaction.get()
		return interaction.name === 'pointing' && interaction.rightUndecided
	}

	/**
	 * The current multi-touch / pinch gesture lifecycle. Both input streams feed
	 * this one state machine: the pointer stream tracks how many touch pointers are
	 * down (so a second finger is recognised the moment it lands, deterministically,
	 * rather than whenever the touch-stream `pinch_start` arrives), and the
	 * touch/gesture stream confirms the pinch.
	 *
	 * - `'idle'` — no multi-touch gesture is active.
	 * - `'multi-touch'` — two or more touch pointers are down, but a pinch hasn't
	 *   started yet.
	 * - `'pinching'` — a pinch is in progress.
	 *
	 * `getIsPinching()` is derived from this. The pointer dispatch ignores pointer
	 * events whenever this is not `'idle'`, so the fingers of a gesture never reach
	 * the active tool.
	 * @internal
	 */
	private _gesturePhase = atom<TLGesturePhase>('gesturePhase', 'idle')

	/** The ids of the touch pointers currently down. @internal */
	private _touchPointerIds = new Set<number>()

	/**
	 * The current multi-touch / pinch gesture phase.
	 */
	getGesturePhase(): TLGesturePhase {
		return this._gesturePhase.get()
	}

	/**
	 * Record a touch pointer going down. Returns `true` if this is the pointer that
	 * starts a multi-touch gesture (the transition into `'multi-touch'`), so the
	 * caller can interrupt the first finger's interaction once.
	 * @internal
	 */
	addTouchPointer(pointerId: number): boolean {
		this._touchPointerIds.add(pointerId)
		if (this._touchPointerIds.size >= 2 && this._gesturePhase.get() === 'idle') {
			this._gesturePhase.set('multi-touch')
			return true
		}
		return false
	}

	/**
	 * Record a touch pointer going up or being cancelled. Drops back out of the
	 * `'multi-touch'` phase once fewer than two fingers remain; a `'pinching'` phase
	 * is left to end through `pinch_end` / {@link InputsManager.endGesture}.
	 * @internal
	 */
	removeTouchPointer(pointerId: number): void {
		this._touchPointerIds.delete(pointerId)
		if (this._touchPointerIds.size < 2 && this._gesturePhase.get() === 'multi-touch') {
			this._gesturePhase.set('idle')
		}
	}

	/**
	 * End the current gesture: clear the tracked touch pointers and return to the
	 * `'idle'` phase. Called on `pinch_end`.
	 * @internal
	 */
	endGesture(): void {
		this._touchPointerIds.clear()
		this._gesturePhase.set('idle')
	}

	/**
	 * Whether the user is pinching.
	 */
	getIsPinching() {
		return this._gesturePhase.get() === 'pinching'
	}
	/**
	 * @deprecated Use `getIsPinching()` instead.
	 */
	// eslint-disable-next-line tldraw/no-setter-getter
	get isPinching() {
		return this.getIsPinching()
	}
	// eslint-disable-next-line tldraw/no-setter-getter
	set isPinching(isPinching: boolean) {
		this.setIsPinching(isPinching)
	}
	/**
	 * @param isPinching - Whether the user is pinching.
	 * @internal
	 */
	setIsPinching(isPinching: boolean) {
		if (isPinching) {
			this._gesturePhase.set('pinching')
		} else if (this._gesturePhase.get() === 'pinching') {
			// The pinch ended: fall back to multi-touch if fingers are still down,
			// otherwise to idle.
			this._gesturePhase.set(this._touchPointerIds.size >= 2 ? 'multi-touch' : 'idle')
		}
	}

	private _isEditing = atom<boolean>('isEditing', false)
	/**
	 * Whether the user is editing.
	 */
	getIsEditing() {
		return this._isEditing.get()
	}
	/**
	 * @deprecated Use `getIsEditing()` instead.
	 */
	// eslint-disable-next-line tldraw/no-setter-getter
	get isEditing() {
		return this.getIsEditing()
	}
	// eslint-disable-next-line tldraw/no-setter-getter
	set isEditing(isEditing: boolean) {
		this.setIsEditing(isEditing)
	}
	/**
	 * @param isEditing - Whether the user is editing.
	 */
	setIsEditing(isEditing: boolean) {
		this._isEditing.set(isEditing)
	}

	/**
	 * Whether the user is panning the camera.
	 */
	getIsPanning() {
		return this._interaction.get().name === 'panning'
	}
	/**
	 * @deprecated Use `getIsPanning()` instead.
	 */
	// eslint-disable-next-line tldraw/no-setter-getter
	get isPanning() {
		return this.getIsPanning()
	}
	// eslint-disable-next-line tldraw/no-setter-getter
	set isPanning(isPanning: boolean) {
		if (isPanning) this.beginPanning(this.keys.has('Space') ? 'spacebar' : 'middle')
		else this.endPanning()
	}

	/**
	 * Whether the user is panning with the spacebar held.
	 */
	getIsSpacebarPanning() {
		const interaction = this._interaction.get()
		return interaction.name === 'panning' && interaction.via === 'spacebar'
	}
	/**
	 * @deprecated Use `getIsSpacebarPanning()` instead.
	 */
	// eslint-disable-next-line tldraw/no-setter-getter
	get isSpacebarPanning() {
		return this.getIsSpacebarPanning()
	}
	// eslint-disable-next-line tldraw/no-setter-getter
	set isSpacebarPanning(isSpacebarPanning: boolean) {
		const interaction = this._interaction.get()
		if (isSpacebarPanning) {
			if (interaction.name === 'panning') {
				if (interaction.via !== 'spacebar')
					this._interaction.set({ ...interaction, via: 'spacebar' })
			} else {
				this.beginPanning('spacebar')
			}
		} else if (interaction.name === 'panning' && interaction.via === 'spacebar') {
			this.endPanning()
		}
	}

	@computed private _getHasCollaborators() {
		return this.editor.getCollaborators().length > 0 // could we do this more efficiently?
	}

	/**
	 * The previous point used for velocity calculation (updated each tick, not each pointer event).
	 * @internal
	 */
	private _velocityPrevPoint = new Vec()

	/**
	 * Update the pointer velocity based on elapsed time. Called by the tick manager.
	 * @param elapsed - The time elapsed since the last tick in milliseconds.
	 * @internal
	 */
	updatePointerVelocity(elapsed: number) {
		const currentScreenPoint = this.getCurrentScreenPoint()
		const pointerVelocity = this.getPointerVelocity()

		if (elapsed === 0) return

		const delta = Vec.Sub(currentScreenPoint, this._velocityPrevPoint)
		this._velocityPrevPoint = currentScreenPoint.clone()

		const length = delta.len()
		const direction = length ? delta.div(length) : new Vec(0, 0)

		// Preserve the old 16ms smoothing with alpha = 1 - (1 - 0.5)^(elapsed / 16).
		const smoothing =
			1 -
			Math.pow(
				1 - POINTER_VELOCITY_REFERENCE_SMOOTHING,
				elapsed / POINTER_VELOCITY_REFERENCE_INTERVAL_MS
			)
		const next = pointerVelocity.clone().lrp(direction.mul(length / elapsed), smoothing)

		// if the velocity is very small, just set it to 0
		if (Math.abs(next.x) < 0.01) next.x = 0
		if (Math.abs(next.y) < 0.01) next.y = 0

		if (!pointerVelocity.equals(next)) {
			this._pointerVelocity.set(next)
		}
	}

	/**
	 * Update the input points from a pointer, pinch, or wheel event.
	 *
	 * @param info - The event info.
	 * @internal
	 */
	updateFromEvent(info: TLPointerEventInfo | TLPinchEventInfo | TLWheelEventInfo): void {
		const currentScreenPoint = this._currentScreenPoint.__unsafe__getWithoutCapture()
		const currentPagePoint = this._currentPagePoint.__unsafe__getWithoutCapture()
		const isPinching = this._gesturePhase.__unsafe__getWithoutCapture() === 'pinching'
		const { screenBounds } = this.editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!
		const { x: cx, y: cy, z: cz } = unsafe__withoutCapture(() => this.editor.getCamera())

		const sx = info.point.x - screenBounds.x
		const sy = info.point.y - screenBounds.y
		const sz = info.point.z ?? 0.5

		this._previousScreenPoint.set(currentScreenPoint)
		this._previousPagePoint.set(currentPagePoint)

		// The "screen bounds" is relative to the user's actual screen.
		// The "screen point" is relative to the "screen bounds";
		// it will be 0,0 when its actual screen position is equal
		// to screenBounds.point. This is confusing!
		this._currentScreenPoint.set(new Vec(sx, sy))
		const nx = sx / cz - cx
		const ny = sy / cz - cy
		if (isFinite(nx) && isFinite(ny)) {
			this._currentPagePoint.set(new Vec(nx, ny, sz))
		}

		this._isPen.set(info.type === 'pointer' && info.isPen)

		// Reset velocity on pointer down, or when a pinch starts or ends
		if (info.name === 'pointer_down' || isPinching) {
			this._pointerVelocity.set(new Vec())
			this._originScreenPoint.set(this._currentScreenPoint.__unsafe__getWithoutCapture())
			this._originPagePoint.set(this._currentPagePoint.__unsafe__getWithoutCapture())
		}

		if (this._getHasCollaborators()) {
			this.editor.run(
				() => {
					const pagePoint = this._currentPagePoint.__unsafe__getWithoutCapture()
					this.editor.store.put([
						{
							id: TLPOINTER_ID,
							typeName: 'pointer',
							x: pagePoint.x,
							y: pagePoint.y,
							lastActivityTimestamp:
								// If our pointer moved only because we're following some other user, then don't
								// update our last activity timestamp; otherwise, update it to the current timestamp.
								info.type === 'pointer' && info.pointerId === INTERNAL_POINTER_IDS.CAMERA_MOVE
									? (this.editor.store.unsafeGetWithoutCapture(TLPOINTER_ID)
											?.lastActivityTimestamp ?? Date.now())
									: Date.now(),
							meta: {},
						},
					])
				},
				{ history: 'ignore' }
			)
		}
	}

	toJson() {
		return {
			originPagePoint: this._originPagePoint.get().toJson(),
			originScreenPoint: this._originScreenPoint.get().toJson(),
			previousPagePoint: this._previousPagePoint.get().toJson(),
			previousScreenPoint: this._previousScreenPoint.get().toJson(),
			currentPagePoint: this._currentPagePoint.get().toJson(),
			currentScreenPoint: this._currentScreenPoint.get().toJson(),
			pointerVelocity: this._pointerVelocity.get().toJson(),
			shiftKey: this._shiftKey.get(),
			metaKey: this._metaKey.get(),
			ctrlKey: this._ctrlKey.get(),
			altKey: this._altKey.get(),
			isPen: this._isPen.get(),
			isDragging: this.getIsDragging(),
			isPointing: this.getIsPointing(),
			isPinching: this.getIsPinching(),
			gesturePhase: this._gesturePhase.get(),
			interaction: this._interaction.get(),
			isEditing: this._isEditing.get(),
			isPanning: this.getIsPanning(),
			isSpacebarPanning: this.getIsSpacebarPanning(),
			keys: Array.from(this.keys.keys()),
			buttons: Array.from(this.buttons.keys()),
		}
	}
}
