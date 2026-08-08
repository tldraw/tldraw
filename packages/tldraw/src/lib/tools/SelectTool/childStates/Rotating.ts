import {
	RotateCorner,
	StateNode,
	TLPointerEventInfo,
	TLRotationSnapshot,
	applyRotationToSnapshotShapes,
	degreesToRadians,
	getRotationSnapshot,
	kickoutOccludedShapes,
	shortAngleDist,
	snapAngle,
} from '@tldraw/editor'
import { GestureShapeChangeTracker } from '../GestureShapeChangeTracker'
import { CursorTypeMap } from './PointingResizeHandle'

const ONE_DEGREE = Math.PI / 180

export class Rotating extends StateNode {
	static override id = 'rotating'
	static override trackPerformance = true

	snapshot = {} as TLRotationSnapshot

	info = {} as Extract<TLPointerEventInfo, { target: 'selection' }> & {
		onInteractionEnd?: string | (() => void)
	}

	markId = ''

	private changeTracker = new GestureShapeChangeTracker(
		this.editor,
		(id) => this.snapshot.shapeSnapshots?.some((s) => s.shape.id === id) ?? false
	)

	override onEnter(
		info: TLPointerEventInfo & { target: 'selection'; onInteractionEnd?: string | (() => void) }
	) {
		// Store the event information
		this.info = info
		if (typeof info.onInteractionEnd === 'string') {
			this.parent.setCurrentToolIdMask(info.onInteractionEnd)
		}

		this.markId = this.editor.markHistoryStoppingPoint('rotate start')

		const snapshot = getRotationSnapshot({
			editor: this.editor,
			ids: this.editor.getSelectedShapeIds(),
		})
		if (!snapshot) {
			this.parent.transition('idle', this.info)
			return
		}
		this.snapshot = snapshot

		// Watch for changes made to the rotating shapes from outside this interaction.
		this.changeTracker.start()

		// Trigger a pointer move
		const newSelectionRotation = this._getRotationFromPointerPosition({
			snapToNearestDegree: false,
		})

		this.changeTracker.ignoreChanges(() => {
			applyRotationToSnapshotShapes({
				editor: this.editor,
				delta: this._getRotationFromPointerPosition({ snapToNearestDegree: false }),
				snapshot: this.snapshot,
				stage: 'start',
			})
		})

		// Update cursor
		this.editor.setCursor({
			type: CursorTypeMap[this.info.handle as RotateCorner],
			rotation: newSelectionRotation + this.snapshot.initialShapesRotation,
		})
	}

	override onExit() {
		this.changeTracker.stop()
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
		this.changeTracker.ignoreChanges(() => {
			// Rotation recomputes each shape from `snapshot + delta` every update, so
			// a change made to the rotating shapes from outside this interaction
			// would otherwise be stomped here. When the tracker has noticed such a
			// change, re-anchor the snapshot onto the current shapes first.
			if (this.changeTracker.getAndClearChanged()) {
				this.reanchorSnapshot()
			}

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
		})
	}

	// Rebuild the rotation snapshot from the current shapes after an external
	// change, resetting the cursor-angle baseline to the current pointer so the
	// in-progress rotation continues from the changed shapes without jumping.
	private reanchorSnapshot() {
		const snapshot = getRotationSnapshot({
			editor: this.editor,
			ids: this.editor.getSelectedShapeIds(),
		})
		if (!snapshot) return
		snapshot.initialCursorAngle = snapshot.initialPageCenter.angle(
			this.editor.inputs.getCurrentPagePoint()
		)
		this.snapshot = snapshot
	}

	private cancel() {
		// Call onRotateCancel callback before bailing to mark
		const { shapeSnapshots } = this.snapshot

		shapeSnapshots.forEach(({ shape }) => {
			const current = this.editor.getShape(shape.id)
			if (current) {
				const util = this.editor.getShapeUtil(shape)
				util.onRotateCancel?.(shape, current)
			}
		})

		this.editor.bailToMark(this.markId)
		const { onInteractionEnd } = this.info
		if (onInteractionEnd) {
			if (typeof onInteractionEnd === 'string') {
				this.editor.setCurrentTool(onInteractionEnd, this.info)
			} else {
				onInteractionEnd()
			}
			return
		}
		this.parent.transition('idle', this.info)
	}

	private complete() {
		this.changeTracker.ignoreChanges(() => {
			if (this.changeTracker.getAndClearChanged()) {
				this.reanchorSnapshot()
			}
			applyRotationToSnapshotShapes({
				editor: this.editor,
				delta: this._getRotationFromPointerPosition({ snapToNearestDegree: true }),
				snapshot: this.snapshot,
				stage: 'end',
			})
		})
		kickoutOccludedShapes(
			this.editor,
			this.snapshot.shapeSnapshots.map((s) => s.shape.id)
		)
		const { onInteractionEnd } = this.info
		if (onInteractionEnd) {
			if (typeof onInteractionEnd === 'string') {
				this.editor.setCurrentTool(onInteractionEnd, this.info)
			} else {
				onInteractionEnd()
			}
			return
		}
		this.parent.transition('idle', this.info)
	}

	_getRotationFromPointerPosition({ snapToNearestDegree }: { snapToNearestDegree: boolean }) {
		const shiftKey = this.editor.inputs.getShiftKey()
		const currentPagePoint = this.editor.inputs.getCurrentPagePoint()
		const { initialCursorAngle, initialShapesRotation, initialPageCenter } = this.snapshot

		// The delta is the difference between the current angle and the initial angle
		const preSnapRotationDelta = initialPageCenter.angle(currentPagePoint) - initialCursorAngle
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
