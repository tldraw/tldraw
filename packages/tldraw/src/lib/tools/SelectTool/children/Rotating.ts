import {
	EPSILON,
	RotateCorner,
	StateNode,
	TLEventHandlers,
	TLPointerEventInfo,
	TLRotationSnapshot,
	angleDelta,
	applyRotationToSnapshotShapes,
	degreesToRadians,
	getRotationSnapshot,
	snapAngle,
} from '@tldraw/editor'
import { CursorTypeMap } from './PointingResizeHandle'

export class Rotating extends StateNode {
	static override id = 'rotating'

	snapshot = {} as TLRotationSnapshot

	info = {} as Extract<TLPointerEventInfo, { target: 'selection' }> & { onInteractionEnd?: string }

	markId = ''

	override onEnter = (
		info: TLPointerEventInfo & { target: 'selection'; onInteractionEnd?: string }
	) => {
		// Store the event information
		this.info = info
		this.parent.currentToolIdMask = info.onInteractionEnd

		this.markId = 'rotate start'
		this.editor.mark(this.markId)

		const snapshot = getRotationSnapshot({ editor: this.editor })
		if (!snapshot) return this.parent.transition('idle', this.info)
		this.snapshot = snapshot

		// Trigger a pointer move
		this.handleStart()
	}

	override onExit = () => {
		this.editor.setCursor({ type: 'default', rotation: 0 })
		this.parent.currentToolIdMask = undefined

		this.snapshot = {} as TLRotationSnapshot
	}

	override onPointerMove = () => {
		this.update()
	}

	override onKeyDown = () => {
		this.update()
	}

	override onKeyUp = () => {
		this.update()
	}

	override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.complete()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
		this.complete()
	}

	override onCancel = () => {
		this.cancel()
	}

	// ---

	private update = () => {
		const newSelectionRotation = this._getRotationFromPointerPosition({
			snapToNearestDegree: false,
		})

		applyRotationToSnapshotShapes({
			editor: this.editor,
			delta: newSelectionRotation,
			snapshot: this.snapshot,
			stage: 'update',
		})

		// Update cursor
		this.editor.updateInstanceState({
			cursor: {
				type: CursorTypeMap[this.info.handle as RotateCorner],
				rotation: newSelectionRotation + this.snapshot.initialSelectionRotation,
			},
		})
	}

	private cancel = () => {
		this.editor.bailToMark(this.markId)
		if (this.info.onInteractionEnd) {
			this.editor.setCurrentTool(this.info.onInteractionEnd, this.info)
		} else {
			this.parent.transition('idle', this.info)
		}
	}

	private complete = () => {
		applyRotationToSnapshotShapes({
			editor: this.editor,
			delta: this._getRotationFromPointerPosition({ snapToNearestDegree: true }),
			snapshot: this.snapshot,
			stage: 'end',
		})
		if (this.info.onInteractionEnd) {
			this.editor.setCurrentTool(this.info.onInteractionEnd, this.info)
		} else {
			this.parent.transition('idle', this.info)
		}
	}

	protected handleStart() {
		const newSelectionRotation = this._getRotationFromPointerPosition({
			snapToNearestDegree: false,
		})

		applyRotationToSnapshotShapes({
			editor: this.editor,
			delta: this._getRotationFromPointerPosition({ snapToNearestDegree: false }),
			snapshot: this.snapshot,
			stage: 'start',
		})

		// Update cursor
		this.editor.updateInstanceState({
			cursor: {
				type: CursorTypeMap[this.info.handle as RotateCorner],
				rotation: newSelectionRotation + this.snapshot.initialSelectionRotation,
			},
		})
	}

	_getRotationFromPointerPosition({ snapToNearestDegree }: { snapToNearestDegree: boolean }) {
		const {
			selectionRotatedPageBounds: selectionBounds,
			selectionRotation,
			inputs: { shiftKey, currentPagePoint },
		} = this.editor
		const { initialCursorAngle, initialSelectionRotation } = this.snapshot

		if (!selectionBounds) return initialSelectionRotation

		const selectionPageCenter = selectionBounds.center
			.clone()
			.rotWith(selectionBounds.point, selectionRotation)

		// The delta is the difference between the current angle and the initial angle
		const preSnapRotationDelta = selectionPageCenter.angle(currentPagePoint) - initialCursorAngle
		let newSelectionRotation = initialSelectionRotation + preSnapRotationDelta

		if (shiftKey) {
			newSelectionRotation = snapAngle(newSelectionRotation, 24)
		} else if (snapToNearestDegree) {
			newSelectionRotation = Math.round(newSelectionRotation / EPSILON) * EPSILON

			if (this.editor.instanceState.isCoarsePointer) {
				const snappedToRightAngle = snapAngle(newSelectionRotation, 4)
				const angleToRightAngle = angleDelta(newSelectionRotation, snappedToRightAngle)
				if (Math.abs(angleToRightAngle) < degreesToRadians(5)) {
					newSelectionRotation = snappedToRightAngle
				}
			}
		}

		return newSelectionRotation - initialSelectionRotation
	}
}
