import { isShapeId, TLShape, TLShapePartial } from '@tldraw/tlschema'
import { structuredClone } from '@tldraw/utils'
import { Editor } from '../editor/Editor'
import { Mat } from '../primitives/Mat'
import { canonicalizeRotation } from '../primitives/utils'
import { Vec } from '../primitives/Vec'

/** @internal */
export function getRotationSnapshot({ editor }: { editor: Editor }): TLRotationSnapshot | null {
	const selectedShapes = editor.getSelectedShapes()
	const selectionRotation = editor.getSelectionRotation()
	const selectionBounds = editor.getSelectionRotatedPageBounds()
	const {
		inputs: { originPagePoint },
	} = editor

	// todo: this assumes we're rotating the selected shapes
	// if we try to rotate shapes that aren't selected, this
	// will produce the wrong results

	// Return null if there are no selected shapes
	if (!selectionBounds) {
		return null
	}

	const selectionPageCenter = selectionBounds.center
		.clone()
		.rotWith(selectionBounds.point, selectionRotation)

	return {
		selectionPageCenter: selectionPageCenter,
		initialCursorAngle: selectionPageCenter.angle(originPagePoint),
		initialSelectionRotation: selectionRotation,
		shapeSnapshots: selectedShapes.map((shape) => ({
			shape: structuredClone(shape),
			initialPagePoint: editor.getShapePageTransform(shape.id)!.point(),
		})),
	}
}

/**
 * Info about a rotation that can be applied to the editor's selected shapes.
 *
 * @param selectionPageCenter - The center of the selection in page coordinates
 * @param initialCursorAngle - The angle of the cursor relative to the selection center when the rotation started
 * @param initialSelectionRotation - The rotation of the selection when the rotation started
 * @param shapeSnapshots - Info about each shape that is being rotated
 *
 * @public
 **/
export interface TLRotationSnapshot {
	selectionPageCenter: Vec
	initialCursorAngle: number
	initialSelectionRotation: number
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
}: {
	delta: number
	snapshot: TLRotationSnapshot
	editor: Editor
	stage: 'start' | 'update' | 'end' | 'one-off'
}) {
	const { selectionPageCenter, shapeSnapshots } = snapshot

	editor.updateShapes(
		shapeSnapshots.map(({ shape, initialPagePoint }) => {
			// We need to both rotate each shape individually and rotate the shapes
			// around the pivot point (the average center of all rotating shapes.)

			const parentTransform = isShapeId(shape.parentId)
				? editor.getShapePageTransform(shape.parentId)!
				: Mat.Identity()

			const newPagePoint = Vec.RotWith(initialPagePoint, selectionPageCenter, delta)

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
			}
		})
	)

	// Handle change

	const changes: TLShapePartial[] = []

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
