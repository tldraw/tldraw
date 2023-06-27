import { angleDelta, degreesToRadians, EPSILON, RotateCorner, snapAngle } from '@tldraw/primitives'
import {
	applyRotationToSnapshotShapes,
	getRotationSnapshot,
	TLRotationSnapshot,
} from '../../../../utils/rotation'
import { TLEventHandlers, TLPointerEventInfo } from '../../../types/event-types'
import { StateNode } from '../../StateNode'
import { CursorTypeMap } from './PointingResizeHandle'

export class Rotating extends StateNode {
	static override id = 'rotating'

	snapshot = {} as TLRotationSnapshot

	info = {} as Extract<TLPointerEventInfo, { target: 'selection' }> & { onInteractionEnd?: string }

	markId = ''

	override onEnter = (
		info: Extract<TLPointerEventInfo, { target: 'selection'; onInteractionEnd?: string }>
	) => {
		// Store the event information
		this.info = info

		this.markId = this.editor.mark('rotate start')

		const snapshot = getRotationSnapshot({ editor: this.editor })
		if (!snapshot) return this.parent.transition('idle', this.info)
		this.snapshot = snapshot

		// Trigger a pointer move
		this.handleStart()
	}

	override onExit = () => {
		this.editor.setCursor({ type: 'none' })

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
		this.editor.setCursor({
			type: CursorTypeMap[this.info.handle as RotateCorner],
			rotation: newSelectionRotation + this.snapshot.initialSelectionRotation,
		})
	}

	private cancel = () => {
		this.editor.bailToMark(this.markId)
		if (this.info.onInteractionEnd) {
			this.editor.setSelectedTool(this.info.onInteractionEnd, this.info)
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
			this.editor.setSelectedTool(this.info.onInteractionEnd, this.info)
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
		this.editor.setCursor({
			type: CursorTypeMap[this.info.handle as RotateCorner],
			rotation: newSelectionRotation + this.snapshot.initialSelectionRotation,
		})
	}

	_getRotationFromPointerPosition({ snapToNearestDegree }: { snapToNearestDegree: boolean }) {
		const {
			selectionPageCenter,
			inputs: { shiftKey, currentPagePoint },
		} = this.editor
		const { initialCursorAngle, initialSelectionRotation } = this.snapshot

		// The delta is the difference between the current angle and the initial angle
		if (!selectionPageCenter) return initialSelectionRotation
		const preSnapRotationDelta = selectionPageCenter.angle(currentPagePoint) - initialCursorAngle
		let newSelectionRotation = initialSelectionRotation + preSnapRotationDelta

		if (shiftKey) {
			newSelectionRotation = snapAngle(newSelectionRotation, 24)
		} else if (snapToNearestDegree) {
			newSelectionRotation = Math.round(newSelectionRotation / EPSILON) * EPSILON

			if (this.editor.isCoarsePointer) {
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
