import {
	RotateCorner,
	StateNode,
	TLPointerEventInfo,
	TLRotationSnapshot,
	applyRotationToSnapshotShapes,
	degreesToRadians,
	getRotationSnapshot,
	shortAngleDist,
	snapAngle,
} from '@tldraw/editor'
import { kickoutOccludedShapes } from '../selectHelpers'
import { CursorTypeMap } from './PointingResizeHandle'

const ONE_DEGREE = Math.PI / 180

export class Rotating extends StateNode {
	static override id = 'rotating'

	snapshot = {} as TLRotationSnapshot

	info = {} as Extract<TLPointerEventInfo, { target: 'selection' }> & { onInteractionEnd?: string }

	markId = ''

	override onEnter(info: TLPointerEventInfo & { target: 'selection'; onInteractionEnd?: string }) {
		// Store the event information
		this.info = info
		this.parent.setCurrentToolIdMask(info.onInteractionEnd)

		this.markId = this.editor.markHistoryStoppingPoint('rotate start')

		const snapshot = getRotationSnapshot({
			editor: this.editor,
			ids: this.editor.getSelectedShapeIds(),
		})
		if (!snapshot) return this.parent.transition('idle', this.info)
		this.snapshot = snapshot

		// Trigger a pointer move
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
			rotation: newSelectionRotation + this.snapshot.initialShapesRotation,
		})
	}

	override onExit() {
		this.editor.setCursor({ type: 'default', rotation: 0 })
		this.parent.setCurrentToolIdMask(undefined)

		this.snapshot = {} as TLRotationSnapshot
	}

	override onPointerMove() {
		this.update()
	}

	override onKeyDown() {
		this.update()
	}

	override onKeyUp() {
		this.update()
	}

	override onPointerUp() {
		this.complete()
	}

	override onComplete() {
		this.complete()
	}

	override onCancel() {
		this.cancel()
	}

	// ---

	private update() {
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
			rotation: newSelectionRotation + this.snapshot.initialShapesRotation,
		})
	}

	private cancel() {
		this.editor.bailToMark(this.markId)
		if (this.info.onInteractionEnd) {
			this.editor.setCurrentTool(this.info.onInteractionEnd, this.info)
		} else {
			this.parent.transition('idle', this.info)
		}
	}

	private complete() {
		applyRotationToSnapshotShapes({
			editor: this.editor,
			delta: this._getRotationFromPointerPosition({ snapToNearestDegree: true }),
			snapshot: this.snapshot,
			stage: 'end',
		})
		kickoutOccludedShapes(
			this.editor,
			this.snapshot.shapeSnapshots.map((s) => s.shape.id)
		)
		if (this.info.onInteractionEnd) {
			this.editor.setCurrentTool(this.info.onInteractionEnd, this.info)
		} else {
			this.parent.transition('idle', this.info)
		}
	}

	_getRotationFromPointerPosition({ snapToNearestDegree }: { snapToNearestDegree: boolean }) {
		const selectionRotation = this.editor.getSelectionRotation()
		const selectionBounds = this.editor.getSelectionRotatedPageBounds()
		const {
			inputs: { shiftKey, currentPagePoint },
		} = this.editor
		const { initialCursorAngle, initialShapesRotation } = this.snapshot

		if (!selectionBounds) return initialShapesRotation

		const selectionPageCenter = selectionBounds.center
			.clone()
			.rotWith(selectionBounds.point, selectionRotation)

		// The delta is the difference between the current angle and the initial angle
		const preSnapRotationDelta = selectionPageCenter.angle(currentPagePoint) - initialCursorAngle
		let newSelectionRotation = initialShapesRotation + preSnapRotationDelta

		if (shiftKey) {
			newSelectionRotation = snapAngle(newSelectionRotation, 24)
		} else if (snapToNearestDegree) {
			newSelectionRotation = Math.round(newSelectionRotation / ONE_DEGREE) * ONE_DEGREE

			if (this.editor.getInstanceState().isCoarsePointer) {
				const snappedToRightAngle = snapAngle(newSelectionRotation, 4)
				const angleToRightAngle = shortAngleDist(newSelectionRotation, snappedToRightAngle)
				if (Math.abs(angleToRightAngle) < degreesToRadians(5)) {
					newSelectionRotation = snappedToRightAngle
				}
			}
		}

		return newSelectionRotation - initialShapesRotation
	}
}
