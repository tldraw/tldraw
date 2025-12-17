import { atom, computed, unsafe__withoutCapture } from '@tldraw/state'
import { AtomSet } from '@tldraw/store'
import { TLINSTANCE_ID, TLPOINTER_ID } from '@tldraw/tlschema'
import { INTERNAL_POINTER_IDS } from '../../../constants'
import { Vec } from '../../../primitives/Vec'
import { isAccelKey } from '../../../utils/keyboard'
import { Editor } from '../../Editor'
import { TLPinchEventInfo, TLPointerEventInfo, TLWheelEventInfo } from '../../types/event-types'

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
	// eslint-disable-next-line no-restricted-syntax
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
	// eslint-disable-next-line no-restricted-syntax
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
	// eslint-disable-next-line no-restricted-syntax
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
	// eslint-disable-next-line no-restricted-syntax
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
	// eslint-disable-next-line no-restricted-syntax
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
	// eslint-disable-next-line no-restricted-syntax
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
	// eslint-disable-next-line no-restricted-syntax
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
	// eslint-disable-next-line no-restricted-syntax
	get isPen() {
		return this.getIsPen()
	}
	// eslint-disable-next-line no-restricted-syntax
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
	// eslint-disable-next-line no-restricted-syntax
	get shiftKey() {
		return this.getShiftKey()
	}
	// eslint-disable-next-line no-restricted-syntax
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
	// eslint-disable-next-line no-restricted-syntax
	get metaKey() {
		return this.getMetaKey()
	}
	// eslint-disable-next-line no-restricted-syntax
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
	// eslint-disable-next-line no-restricted-syntax
	get ctrlKey() {
		return this.getCtrlKey()
	}
	// eslint-disable-next-line no-restricted-syntax
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
	// eslint-disable-next-line no-restricted-syntax
	get altKey() {
		return this.getAltKey()
	}
	// eslint-disable-next-line no-restricted-syntax
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
	// eslint-disable-next-line no-restricted-syntax
	get accelKey() {
		return this.getAccelKey()
	}

	private _isDragging = atom<boolean>('isDragging', false)
	/**
	 * Whether the user is dragging.
	 */
	getIsDragging() {
		return this._isDragging.get()
	}
	/**
	 * Soon to be deprecated, use `getIsDragging()` instead.
	 */
	// eslint-disable-next-line no-restricted-syntax
	get isDragging() {
		return this.getIsDragging()
	}
	// eslint-disable-next-line no-restricted-syntax
	set isDragging(isDragging: boolean) {
		this.setIsDragging(isDragging)
	}
	/**
	 * @param isDragging - Whether the user is dragging.
	 */
	setIsDragging(isDragging: boolean) {
		this._isDragging.set(isDragging)
	}

	private _isPointing = atom<boolean>('isPointing', false)
	/**
	 * Whether the user is pointing.
	 */
	getIsPointing() {
		return this._isPointing.get()
	}
	/**
	 * @deprecated Use `getIsPointing()` instead.
	 */
	// eslint-disable-next-line no-restricted-syntax
	get isPointing() {
		return this.getIsPointing()
	}
	// eslint-disable-next-line no-restricted-syntax
	set isPointing(isPointing: boolean) {
		this.setIsPointing(isPointing)
	}
	/**
	 * @param isPointing - Whether the user is pointing.
	 * @internal
	 */
	setIsPointing(isPointing: boolean) {
		this._isPointing.set(isPointing)
	}

	private _isPinching = atom<boolean>('isPinching', false)
	/**
	 * Whether the user is pinching.
	 */
	getIsPinching() {
		return this._isPinching.get()
	}
	/**
	 * @deprecated Use `getIsPinching()` instead.
	 */
	// eslint-disable-next-line no-restricted-syntax
	get isPinching() {
		return this.getIsPinching()
	}
	// eslint-disable-next-line no-restricted-syntax
	set isPinching(isPinching: boolean) {
		this.setIsPinching(isPinching)
	}
	/**
	 * @param isPinching - Whether the user is pinching.
	 * @internal
	 */
	setIsPinching(isPinching: boolean) {
		this._isPinching.set(isPinching)
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
	// eslint-disable-next-line no-restricted-syntax
	get isEditing() {
		return this.getIsEditing()
	}
	// eslint-disable-next-line no-restricted-syntax
	set isEditing(isEditing: boolean) {
		this.setIsEditing(isEditing)
	}
	/**
	 * @param isEditing - Whether the user is editing.
	 */
	setIsEditing(isEditing: boolean) {
		this._isEditing.set(isEditing)
	}

	private _isPanning = atom<boolean>('isPanning', false)
	/**
	 * Whether the user is panning.
	 */
	getIsPanning() {
		return this._isPanning.get()
	}
	/**
	 * @deprecated Use `getIsPanning()` instead.
	 */
	// eslint-disable-next-line no-restricted-syntax
	get isPanning() {
		return this.getIsPanning()
	}
	// eslint-disable-next-line no-restricted-syntax
	set isPanning(isPanning: boolean) {
		this.setIsPanning(isPanning)
	}
	/**
	 * @param isPanning - Whether the user is panning.
	 * @internal
	 */
	setIsPanning(isPanning: boolean) {
		this._isPanning.set(isPanning)
	}

	private _isSpacebarPanning = atom<boolean>('isSpacebarPanning', false)
	/**
	 * Whether the user is spacebar panning.
	 */
	getIsSpacebarPanning() {
		return this._isSpacebarPanning.get()
	}
	/**
	 * @deprecated Use `getIsSpacebarPanning()` instead.
	 */
	// eslint-disable-next-line no-restricted-syntax
	get isSpacebarPanning() {
		return this.getIsSpacebarPanning()
	}
	// eslint-disable-next-line no-restricted-syntax
	set isSpacebarPanning(isSpacebarPanning: boolean) {
		this.setIsSpacebarPanning(isSpacebarPanning)
	}
	/**
	 * @param isSpacebarPanning - Whether the user is spacebar panning.
	 * @internal
	 */
	setIsSpacebarPanning(isSpacebarPanning: boolean) {
		this._isSpacebarPanning.set(isSpacebarPanning)
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

		// consider adjusting this with an easing rather than a linear interpolation
		const next = pointerVelocity.clone().lrp(direction.mul(length / elapsed), 0.5)

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
		const isPinching = this._isPinching.__unsafe__getWithoutCapture()
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
			isDragging: this._isDragging.get(),
			isPointing: this._isPointing.get(),
			isPinching: this._isPinching.get(),
			isEditing: this._isEditing.get(),
			isPanning: this._isPanning.get(),
			isSpacebarPanning: this._isSpacebarPanning.get(),
			keys: Array.from(this.keys.keys()),
			buttons: Array.from(this.buttons.keys()),
		}
	}
}
