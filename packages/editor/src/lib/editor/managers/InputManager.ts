import { atom, unsafe__withoutCapture } from '@tldraw/state'
import { AtomSet } from '@tldraw/store'
import { TLINSTANCE_ID, TLPOINTER_ID } from '@tldraw/tlschema'
import { INTERNAL_POINTER_IDS } from '../../constants'
import { AtomVec } from '../../primitives/Vec'
import { Editor } from '../Editor'
import { TLPinchEventInfo, TLPointerEventInfo, TLWheelEventInfo } from '../types/event-types'

/** @public */
export class InputManager {
	constructor(private readonly editor: Editor) {}

	/** The most recent pointer down's position in the current page space. */
	readonly originPagePoint = new AtomVec('originPagePoint')
	/** The most recent pointer down's position in screen space. */
	readonly originScreenPoint = new AtomVec('originScreenPoint')
	/** The previous pointer position in the current page space. */
	readonly previousPagePoint = new AtomVec('previousPagePoint')
	/** The previous pointer position in screen space. */
	readonly previousScreenPoint = new AtomVec('previousScreenPoint')
	/** The most recent pointer position in the current page space. */
	readonly currentPagePoint = new AtomVec('currentPagePoint')
	/** The most recent pointer position in screen space. */
	readonly currentScreenPoint = new AtomVec('currentScreenPoint')
	/** Velocity of mouse pointer, in pixels per millisecond */
	readonly pointerVelocity = new AtomVec('pointerVelocity')
	/** A set containing the currently pressed keys. */
	readonly keys = new AtomSet<string>('keys')
	/** A set containing the currently pressed buttons. */
	readonly buttons = new AtomSet<number>('buttons')
	/** Whether the input is from a pe. */
	@atom accessor isPen = false
	/** Whether the shift key is currently pressed. */
	@atom accessor shiftKey = false
	/** Whether the meta key is currently pressed. */
	@atom accessor metaKey = false
	/** Whether the control or command key is currently pressed. */
	@atom accessor ctrlKey = false
	/** Whether the alt or option key is currently pressed. */
	@atom accessor altKey = false
	/** Whether the user is dragging. */
	@atom accessor isDragging = false
	/** Whether the user is pointing. */
	@atom accessor isPointing = false
	/** Whether the user is pinching. */
	@atom accessor isPinching = false
	/** Whether the user is editing. */
	@atom accessor isEditing = false
	/** Whether the user is panning. */
	@atom accessor isPanning = false
	/** Whether the user is spacebar panning. */
	@atom accessor isSpacebarPanning = false

	updateFromEvent(info: TLPointerEventInfo | TLPinchEventInfo | TLWheelEventInfo) {
		const {
			pointerVelocity,
			previousScreenPoint,
			previousPagePoint,
			currentScreenPoint,
			currentPagePoint,
		} = this

		const { screenBounds } = this.editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!
		const { x: cx, y: cy, z: cz } = unsafe__withoutCapture(() => this.editor.getCamera())

		const sx = info.point.x - screenBounds.x
		const sy = info.point.y - screenBounds.y
		const sz = info.point.z ?? 0.5

		previousScreenPoint.setTo(currentScreenPoint)
		previousPagePoint.setTo(currentPagePoint)

		// The "screen bounds" is relative to the user's actual screen.
		// The "screen point" is relative to the "screen bounds";
		// it will be 0,0 when its actual screen position is equal
		// to screenBounds.point. This is confusing!
		currentScreenPoint.set(sx, sy)
		const nx = sx / cz - cx
		const ny = sy / cz - cy
		if (isFinite(nx) && isFinite(ny)) {
			currentPagePoint.set(nx, ny, sz)
		}

		this.isPen = info.type === 'pointer' && info.isPen

		// Reset velocity on pointer down, or when a pinch starts or ends
		if (info.name === 'pointer_down' || this.isPinching) {
			pointerVelocity.set(0, 0)
			this.originScreenPoint.setTo(currentScreenPoint)
			this.originPagePoint.setTo(currentPagePoint)
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
									this.editor._tickManager.now)
								: this.editor._tickManager.now,
						meta: {},
					},
				])
			},
			{ history: 'ignore' }
		)
	}

	toJson() {
		return {
			originPagePoint: this.originPagePoint.toJson(),
			originScreenPoint: this.originScreenPoint.toJson(),
			previousPagePoint: this.previousPagePoint.toJson(),
			previousScreenPoint: this.previousScreenPoint.toJson(),
			currentPagePoint: this.currentPagePoint.toJson(),
			currentScreenPoint: this.currentScreenPoint.toJson(),
			pointerVelocity: this.pointerVelocity.toJson(),
			keys: Array.from(this.keys.values()),
			buttons: Array.from(this.buttons.values()),
			isPen: this.isPen,
			shiftKey: this.shiftKey,
			metaKey: this.metaKey,
			isDragging: this.isDragging,
			isPointing: this.isPointing,
			isPinching: this.isPinching,
			isEditing: this.isEditing,
			isPanning: this.isPanning,
			isSpacebarPanning: this.isSpacebarPanning,
		}
	}
}
