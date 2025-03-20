import { atom, unsafe__withoutCapture } from '@tldraw/state'
import { AtomSet } from '@tldraw/store'
import { TLINSTANCE_ID, TLPOINTER_ID } from '@tldraw/tlschema'
import { INTERNAL_POINTER_IDS } from '../../constants'
import { ReadonlyVec } from '../../primitives/Vec'
import { isAccelKey } from '../../utils/keyboard'
import { Editor } from '../Editor'
import { TLPinchEventInfo, TLPointerEventInfo, TLWheelEventInfo } from '../types/event-types'

/** @public */
export class InputManager {
	constructor(private readonly editor: Editor) {}

	/** The most recent pointer down's position in the current page space. */
	originPagePoint() {
		return this._originPagePoint.get()
	}
	private _originPagePoint = atom<ReadonlyVec>('originPagePoint', { x: 0, y: 0 })

	/** The most recent pointer down's position in screen space. */
	originScreenPoint() {
		return this._originScreenPoint.get()
	}
	private _originScreenPoint = atom<ReadonlyVec>('originScreenPoint', { x: 0, y: 0 })

	/** The previous pointer position in the current page space. */
	previousPagePoint() {
		return this._previousPagePoint.get()
	}
	private _previousPagePoint = atom<ReadonlyVec>('previousPagePoint', { x: 0, y: 0 })

	/** The previous pointer position in screen space. */
	previousScreenPoint() {
		return this._previousScreenPoint.get()
	}
	private _previousScreenPoint = atom<ReadonlyVec>('previousScreenPoint', { x: 0, y: 0 })

	/** The most recent pointer position in the current page space. */
	currentPagePoint() {
		return this._currentPagePoint.get()
	}
	private _currentPagePoint = atom<ReadonlyVec>('currentPagePoint', { x: 0, y: 0 })

	/** The most recent pointer position in screen space. */
	currentScreenPoint() {
		return this._currentScreenPoint.get()
	}
	private _currentScreenPoint = atom<ReadonlyVec>('currentScreenPoint', { x: 0, y: 0 })

	private _pointerVelocity = atom<ReadonlyVec>('pointerVelocity', { x: 0, y: 0 })
	/** Velocity of mouse pointer, in pixels per millisecond */
	pointerVelocity() {
		return this._pointerVelocity.get()
	}
	/** @internal */
	setPointerVelocity(pointerVelocity: ReadonlyVec) {
		this._pointerVelocity.set(pointerVelocity)
	}

	/** A set containing the currently pressed keys. */
	readonly keys = new AtomSet<string>('keys')

	/** A set containing the currently pressed buttons. */
	buttons = new AtomSet<number>('buttons')

	private _isPen = atom<boolean>('isPen', false)
	/** Whether the input is from a pen. */
	isPen() {
		return this._isPen.get()
	}

	private _shiftKey = atom<boolean>('shiftKey', false)
	/** Whether the shift key is currently pressed. */
	shiftKey() {
		return this._shiftKey.get()
	}
	/** @internal */
	setShiftKey(shiftKey: boolean) {
		this._shiftKey.set(shiftKey)
	}

	private _metaKey = atom<boolean>('metaKey', false)
	/** Whether the meta key is currently pressed. */
	metaKey() {
		return this._metaKey.get()
	}
	/** @internal */
	setMetaKey(metaKey: boolean) {
		this._metaKey.set(metaKey)
	}

	private _ctrlKey = atom<boolean>('ctrlKey', false)
	/** Whether the ctrl or command key is currently pressed. */
	ctrlKey() {
		return this._ctrlKey.get()
	}
	/** @internal */
	setCtrlKey(ctrlKey: boolean) {
		this._ctrlKey.set(ctrlKey)
	}

	private _altKey = atom<boolean>('altKey', false)
	/** Whether the alt or option key is currently pressed. */
	altKey() {
		return this._altKey.get()
	}
	/** @internal */
	setAltKey(altKey: boolean) {
		this._altKey.set(altKey)
	}

	/**
	 * Is the accelerator key (cmd on mac, ctrl elsewhere) currently pressed.
	 */
	accelKey() {
		return isAccelKey({ metaKey: this.metaKey(), ctrlKey: this.ctrlKey() })
	}

	private _isDragging = atom<boolean>('isDragging', false)
	/** Whether the user is dragging. */
	isDragging() {
		return this._isDragging.get()
	}
	/** @internal */
	setIsDragging(isDragging: boolean) {
		this._isDragging.set(isDragging)
	}

	private _isPointing = atom<boolean>('isPointing', false)
	/** Whether the user is pointing. */
	isPointing() {
		return this._isPointing.get()
	}
	/** @internal */
	setIsPointing(isPointing: boolean) {
		this._isPointing.set(isPointing)
	}

	private _isPinching = atom<boolean>('isPinching', false)
	/** Whether the user is pinching. */
	isPinching() {
		return this._isPinching.get()
	}
	/** @internal */
	setIsPinching(isPinching: boolean) {
		this._isPinching.set(isPinching)
	}

	private _isEditing = atom<boolean>('isEditing', false)
	/** Whether the user is editing. */
	isEditing() {
		return this._isEditing.get()
	}

	private _isPanning = atom<boolean>('isPanning', false)
	/** Whether the user is spacebar panning. */
	isPanning() {
		return this._isPanning.get()
	}
	/** @internal */
	setIsPanning(isPanning: boolean) {
		this._isPanning.set(isPanning)
	}

	private _isSpacebarPanning = atom<boolean>('isSpacebarPanning', false)
	/** Whether the user is spacebar panning. */
	isSpacebarPanning() {
		return this._isSpacebarPanning.get()
	}
	/** @internal */
	setIsSpacebarPanning(isSpacebarPanning: boolean) {
		this._isSpacebarPanning.set(isSpacebarPanning)
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
		this._currentScreenPoint.set({ x: sx, y: sy })
		const nx = sx / cz - cx
		const ny = sy / cz - cy
		if (isFinite(nx) && isFinite(ny)) {
			this._currentPagePoint.set({ x: nx, y: ny, z: sz })
		}

		this._isPen.set(info.type === 'pointer' && info.isPen)

		// Reset velocity on pointer down, or when a pinch starts or ends
		if (info.name === 'pointer_down' || isPinching) {
			this._pointerVelocity.set({ x: 0, y: 0 })
			this._originScreenPoint.set(this._currentScreenPoint.__unsafe__getWithoutCapture())
			this._originPagePoint.set(this._currentPagePoint.__unsafe__getWithoutCapture())
		}

		// todo: We only have to do this if there are multiple users in the document
		this.editor.run(
			() => {
				this.editor.store.put([
					{
						id: TLPOINTER_ID,
						typeName: 'pointer',
						x: currentPagePoint.x,
						y: currentPagePoint.y,
						lastActivityTimestamp:
							// If our pointer moved only because we're following some other user, then don't
							// update our last activity timestamp; otherwise, update it to the current timestamp.
							info.type === 'pointer' && info.pointerId === INTERNAL_POINTER_IDS.CAMERA_MOVE
								? (this.editor.store.unsafeGetWithoutCapture(TLPOINTER_ID)?.lastActivityTimestamp ??
									this.editor.tickManager.now)
								: this.editor.tickManager.now,
						meta: {},
					},
				])
			},
			{ history: 'ignore' }
		)
	}
}
