import {
	Editor,
	RotateCorner,
	Session,
	TLRotationSnapshot,
	applyRotationToSnapshotShapes,
	degreesToRadians,
	getRotationSnapshot,
	shortAngleDist,
	snapAngle,
} from '@tldraw/editor'
import { CursorTypeMap } from '../tools/SelectTool/childStates/PointingResizeHandle'

export class RotatingSession extends Session<{ handle: RotateCorner }> {
	id = 'rotating'
	markId = 'rotating'
	snapshot = {} as TLRotationSnapshot
	didRotate = false

	override onStart() {
		const { editor } = this

		const snapshot = getRotationSnapshot({ editor })

		if (snapshot === null) {
			this.cancel()
			return
		}

		this.snapshot = snapshot

		editor.mark(this.markId)

		const newSelectionRotation = getRotationFromPointerPosition({
			editor,
			snapshot,
			snapToNearestDegree: false,
		})

		applyRotationToSnapshotShapes({
			editor: editor,
			delta: newSelectionRotation,
			snapshot: this.snapshot,
			stage: 'start',
		})

		// Update cursor
		editor.setCursor({
			type: CursorTypeMap[this.info.handle as RotateCorner],
			rotation: newSelectionRotation + this.snapshot.initialSelectionRotation,
		})
	}

	override onUpdate() {
		const { editor, snapshot } = this

		if (!editor.inputs.isPointing) {
			this.complete()
			return
		}

		if (!this.didRotate) {
			if (editor.inputs.isDragging) {
				this.didRotate = true
			} else {
				// noop until dragging
				return
			}
		}

		const newSelectionRotation = getRotationFromPointerPosition({
			editor,
			snapshot,
			snapToNearestDegree: false,
		})

		applyRotationToSnapshotShapes({
			editor,
			snapshot,
			delta: newSelectionRotation,
			stage: 'update',
		})

		this.editor.setCursor({
			type: CursorTypeMap[this.info.handle as RotateCorner],
			rotation: snapshot.initialSelectionRotation + newSelectionRotation,
		})
	}

	override onComplete(): void {
		const { editor, snapshot } = this

		const newSelectionRotation = getRotationFromPointerPosition({
			editor,
			snapshot,
			snapToNearestDegree: true,
		})

		applyRotationToSnapshotShapes({
			editor: this.editor,
			delta: newSelectionRotation,
			snapshot: this.snapshot,
			stage: 'end',
		})
	}

	override onCancel() {
		this.editor.bailToMark(this.markId)
	}

	override onEnd() {
		this.editor.setCursor({ type: 'default', rotation: 0 })
	}
}

const ONE_DEGREE = Math.PI / 180

function getRotationFromPointerPosition({
	editor,
	snapshot,
	snapToNearestDegree,
}: {
	editor: Editor
	snapshot: TLRotationSnapshot
	snapToNearestDegree: boolean
}) {
	const { initialCursorAngle, initialSelectionRotation } = snapshot
	const selectionRotation = editor.getSelectionRotation()
	const selectionBounds = editor.getSelectionRotatedPageBounds()
	if (!selectionBounds) return initialSelectionRotation

	const {
		inputs: { shiftKey, currentPagePoint },
	} = editor

	// The delta is the difference between the current angle and the initial angle
	const preSnapRotationDelta =
		selectionBounds.center
			.clone()
			.rotWith(selectionBounds.point, selectionRotation)
			.angle(currentPagePoint) - initialCursorAngle

	let newSelectionRotation = initialSelectionRotation + preSnapRotationDelta

	if (shiftKey) {
		newSelectionRotation = snapAngle(newSelectionRotation, 24)
	} else if (snapToNearestDegree) {
		newSelectionRotation = Math.round(newSelectionRotation / ONE_DEGREE) * ONE_DEGREE

		if (editor.getInstanceState().isCoarsePointer) {
			const snappedToRightAngle = snapAngle(newSelectionRotation, 4)
			const angleToRightAngle = shortAngleDist(newSelectionRotation, snappedToRightAngle)
			if (Math.abs(angleToRightAngle) < degreesToRadians(5)) {
				newSelectionRotation = snappedToRightAngle
			}
		}
	}

	return newSelectionRotation - initialSelectionRotation
}
