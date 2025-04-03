import { isShapeId, TLShape, TLShapeId, TLShapeUpdatePartial } from '@tldraw/tlschema'
import { compact } from '@tldraw/utils'
import { Editor } from '../editor/Editor'
import { Mat } from '../primitives/Mat'
import { canonicalizeRotation } from '../primitives/utils'
import { Vec, VecLike } from '../primitives/Vec'

/** @internal */
export function getRotationSnapshot({
	editor,
	ids,
}: {
	editor: Editor
	ids: TLShapeId[]
}): TLRotationSnapshot | null {
	const shapes = compact(ids.map((id) => editor.getShape(id)))
	const rotation = editor.getShapesSharedRotation(ids)
	const rotatedPageBounds = editor.getShapesRotatedPageBounds(ids)

	// todo: this assumes we're rotating the selected shapes
	// if we try to rotate shapes that aren't selected, this
	// will produce the wrong results

	// Return null if there are no selected shapes
	if (!rotatedPageBounds) {
		return null
	}

	const pageCenter = rotatedPageBounds.center.clone().rotWith(rotatedPageBounds.point, rotation)

	return {
		pageCenter,
		initialCursorAngle: pageCenter.angle(editor.inputs.originPagePoint),
		initialShapesRotation: rotation,
		shapeSnapshots: shapes.map((shape) => ({
			shape,
			initialPagePoint: editor.getShapePageTransform(shape.id)!.point(),
		})),
	}
}

/**
 * @internal
 **/
export interface TLRotationSnapshot {
	pageCenter: Vec
	initialCursorAngle: number
	initialShapesRotation: number
	shapeSnapshots: {
		shape: TLShape
		initialPagePoint: Vec
	}[]
}

/** @internal */
export function applyRotationToSnapshotShapes({
	delta,
	editor,
	snapshot,
	stage,
	centerOverride,
}: {
	delta: number
	snapshot: TLRotationSnapshot
	editor: Editor
	stage: 'start' | 'update' | 'end' | 'one-off'
	centerOverride?: VecLike
}) {
	const { pageCenter, shapeSnapshots } = snapshot

	editor.updateShapes(
		shapeSnapshots.map(({ shape, initialPagePoint }) => {
			// We need to both rotate each shape individually and rotate the shapes
			// around the pivot point (the average center of all rotating shapes.)

			const parentTransform = isShapeId(shape.parentId)
				? editor.getShapePageTransform(shape.parentId)!
				: Mat.Identity()

			const newPagePoint = Vec.RotWith(initialPagePoint, centerOverride ?? pageCenter, delta)

			const newLocalPoint = Mat.applyToPoint(
				// use the current parent transform in case it has moved/resized since the start
				// (e.g. if rotating a shape at the edge of a group)
				Mat.Inverse(parentTransform),
				newPagePoint
			)
			const newRotation = canonicalizeRotation(shape.rotation + delta)

			return {
				id: shape.id,
				x: newLocalPoint.x,
				y: newLocalPoint.y,
				rotation: newRotation,
			}
		})
	)

	// Handle change

	const changes: TLShapeUpdatePartial[] = []

	shapeSnapshots.forEach(({ shape }) => {
		const current = editor.getShape(shape.id)
		if (!current) return
		const util = editor.getShapeUtil(shape)

		if (stage === 'start' || stage === 'one-off') {
			const changeStart = util.onRotateStart?.(shape)
			if (changeStart) changes.push(changeStart)
		}

		const changeUpdate = util.onRotate?.(shape, current)
		if (changeUpdate) changes.push(changeUpdate)

		if (stage === 'end' || stage === 'one-off') {
			const changeEnd = util.onRotateEnd?.(shape, current)
			if (changeEnd) changes.push(changeEnd)
		}
	})

	if (changes.length > 0) {
		editor.updateShapes(changes)
	}
}
