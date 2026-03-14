import { TLShapeId, TLShapePartial } from '@tldraw/tlschema'
import type { Editor } from '../editor/Editor'
import { degreesToRadians, shortAngleDist, snapAngle } from '../primitives/utils'
import { VecLike } from '../primitives/Vec'
import {
	TLRotationSnapshot,
	applyRotationToSnapshotShapes,
	getRotationSnapshot,
} from '../utils/rotation'

const ONE_DEGREE = Math.PI / 180

/** @public */
export interface RotateInteractionStartOpts {
	ids: TLShapeId[]
	/** Initial rotation delta to apply at start. Defaults to 0. */
	delta?: number
}

/** @public */
export interface RotateInteractionUpdateOpts {
	delta: number
}

/**
 * Manages the core rotation logic for both interactive (drag handle) and
 * programmatic (`editor.rotateShapesBy()`) use cases.
 *
 * @public
 */
export class RotateInteraction {
	snapshot: TLRotationSnapshot | null = null

	constructor(public editor: Editor) {}

	/**
	 * Capture a rotation snapshot and apply an initial rotation with `stage: 'start'`.
	 * This fires `onRotateStart` + `onRotate` callbacks once.
	 *
	 * For interactive use where the delta depends on pointer position (which
	 * requires the snapshot to exist first), omit `opts.delta` — the snapshot
	 * will be created but no rotation will be applied. Then call
	 * `getRotationDelta()` + `applyStart(delta)` to apply the start stage.
	 *
	 * Returns `false` if there are no shapes to rotate.
	 */
	start(opts: RotateInteractionStartOpts): boolean {
		const snapshot = getRotationSnapshot({ editor: this.editor, ids: opts.ids })
		if (!snapshot) return false
		this.snapshot = snapshot

		if (opts.delta !== undefined) {
			applyRotationToSnapshotShapes({
				editor: this.editor,
				delta: opts.delta,
				snapshot: this.snapshot,
				stage: 'start',
			})
		}

		return true
	}

	/**
	 * Apply the initial rotation with `stage: 'start'`.
	 * Use this after `start()` when the delta wasn't known at start time.
	 */
	applyStart(delta: number): void {
		if (!this.snapshot) return

		applyRotationToSnapshotShapes({
			editor: this.editor,
			delta,
			snapshot: this.snapshot,
			stage: 'start',
		})
	}

	/**
	 * Apply a rotation delta to the snapshot shapes.
	 */
	update(opts: RotateInteractionUpdateOpts): void {
		if (!this.snapshot) return

		applyRotationToSnapshotShapes({
			editor: this.editor,
			delta: opts.delta,
			snapshot: this.snapshot,
			stage: 'update',
		})
	}

	/**
	 * Finalize the rotation: call `onRotateEnd` on all shapes and kickout occluded shapes.
	 */
	complete(opts?: { delta?: number }): void {
		if (!this.snapshot) return

		if (opts?.delta !== undefined) {
			applyRotationToSnapshotShapes({
				editor: this.editor,
				delta: opts.delta,
				snapshot: this.snapshot,
				stage: 'end',
			})
		} else {
			// Just fire end callbacks without changing positions further
			const changes: TLShapePartial[] = []
			this.snapshot.shapeSnapshots.forEach(({ shape }) => {
				const current = this.editor.getShape(shape.id)
				if (!current) return
				const util = this.editor.getShapeUtil(shape)
				const changeEnd = util.onRotateEnd?.(shape, current)
				if (changeEnd) changes.push(changeEnd)
			})
			if (changes.length > 0) {
				this.editor.updateShapes(changes)
			}
		}

		this.snapshot = null
	}

	/**
	 * Cancel the rotation: call `onRotateCancel` on all shapes.
	 * The caller is responsible for bailing to a mark.
	 */
	cancel(): void {
		if (!this.snapshot) return

		this.snapshot.shapeSnapshots.forEach(({ shape }) => {
			const current = this.editor.getShape(shape.id)
			if (current) {
				const util = this.editor.getShapeUtil(shape)
				util.onRotateCancel?.(shape, current)
			}
		})

		this.snapshot = null
	}

	/**
	 * Compute the rotation delta from the current pointer position.
	 * Extracted from `Rotating._getRotationFromPointerPosition()`.
	 */
	getRotationDelta(opts: { snapToNearestDegree: boolean }): number {
		if (!this.snapshot) return 0

		const { initialCursorAngle, initialShapesRotation, initialPageCenter } = this.snapshot
		const shiftKey = this.editor.inputs.getShiftKey()
		const currentPagePoint = this.editor.inputs.getCurrentPagePoint()

		const preSnapRotationDelta = initialPageCenter.angle(currentPagePoint) - initialCursorAngle
		let newSelectionRotation = initialShapesRotation + preSnapRotationDelta

		if (shiftKey) {
			newSelectionRotation = snapAngle(newSelectionRotation, 24)
		} else if (opts.snapToNearestDegree) {
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

	/**
	 * Perform a one-off rotation: start + update + complete in a single call.
	 * Used by `editor.rotateShapesBy()`.
	 */
	static rotateOneOff(
		editor: Editor,
		ids: TLShapeId[],
		delta: number,
		opts?: { center?: VecLike }
	): void {
		if (ids.length <= 0) return

		const snapshot = getRotationSnapshot({ editor, ids })
		if (!snapshot) return
		applyRotationToSnapshotShapes({
			delta,
			snapshot,
			editor,
			stage: 'one-off',
			centerOverride: opts?.center,
		})
	}
}
