import { isShapeId, TLShape, TLShapeId, TLShapePartial } from '@tldraw/tlschema'
import { compact } from '@tldraw/utils'
import type { Editor } from '../editor/Editor'
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

	const initialPageCenter = rotatedPageBounds.center
		.clone()
		.rotWith(rotatedPageBounds.point, rotation)

	return {
		initialPageCenter,
		initialCursorAngle: initialPageCenter.angle(editor.inputs.getOriginPagePoint()),
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
	initialPageCenter: Vec
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
	const { initialPageCenter, shapeSnapshots } = snapshot

	// Calculate all rotation and position partials
	const positionAndRotationPartials = shapeSnapshots.map(({ shape, initialPagePoint }) => {
		// We need to both rotate each shape individually and rotate the shapes
		// around the pivot point (the average center of all rotating shapes.)

		const parentTransform = isShapeId(shape.parentId)
			? editor.getShapePageTransform(shape.parentId)!
			: Mat.Identity()

		const newPagePoint = Vec.RotWith(initialPagePoint, centerOverride ?? initialPageCenter, delta)

		const newLocalPoint = Mat.applyToPoint(
			// use the current parent transform in case it has moved/resized since the start
			// (e.g. if rotating a shape at the edge of a group)
			Mat.Inverse(parentTransform),
			newPagePoint
		)
		const newRotation = canonicalizeRotation(shape.rotation + delta)

		return {
			id: shape.id,
			type: shape.type,
			x: newLocalPoint.x,
			y: newLocalPoint.y,
			rotation: newRotation,
		} as TLShapePartial
	})

	// Collect callback changes based on the new shapes that will exist after position/rotation update
	const callbackPartials: TLShapePartial[] = []

	shapeSnapshots.forEach(({ shape }, index) => {
		const util = editor.getShapeUtil(shape)

		if (stage === 'start' || stage === 'one-off') {
			const changeStart = util.onRotateStart?.(shape)
			if (changeStart) callbackPartials.push(changeStart)
		}

		// For onRotate callback, we need to pass the updated shape
		// Create a temporary shape with the new rotation/position to get the updated state
		const updatedShapePartial = positionAndRotationPartials[index]
		const tempUpdatedShape = { ...shape, ...updatedShapePartial }
		const changeUpdate = util.onRotate?.(shape, tempUpdatedShape as TLShape)
		if (changeUpdate) callbackPartials.push(changeUpdate)

		if (stage === 'end' || stage === 'one-off') {
			const changeEnd = util.onRotateEnd?.(shape, tempUpdatedShape as TLShape)
			if (changeEnd) callbackPartials.push(changeEnd)
		}
	})

	// Batch all updates together: position/rotation + callbacks
	const allPartials = [...positionAndRotationPartials, ...callbackPartials]
	if (allPartials.length > 0) {
		editor.updateShapes(allPartials)
	}
}
