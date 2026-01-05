import { computed, isUninitialized } from '@tldraw/state'
import { TLShapeId } from '@tldraw/tlschema'
import { Editor } from '../Editor'

/**
 * Non visible shapes are shapes outside of the expanded culling bounds.
 * Uses culling bounds (viewport + margin) to reduce recalculation frequency during pan/zoom.
 *
 * @param editor - Instance of the tldraw Editor.
 * @returns Incremental derivation of non visible shapes.
 */
export function notVisibleShapes(editor: Editor) {
	return computed<Set<TLShapeId>>('notVisibleShapes', function updateNotVisibleShapes(prevValue) {
		const shapeIds = editor.getCurrentPageShapeIds()
		const nextValue = new Set<TLShapeId>()

		// Use culling bounds (updated by computed)
		const cullingBounds = editor._cullingBounds.get()
		if (!cullingBounds) {
			return nextValue
		}
		const viewMinX = cullingBounds.minX
		const viewMinY = cullingBounds.minY
		const viewMaxX = cullingBounds.maxX
		const viewMaxY = cullingBounds.maxY

		for (const id of shapeIds) {
			const pageBounds = editor.getShapePageBounds(id)

			// Hybrid check: if bounds exist and shape overlaps culling bounds, it's visible.
			// This inlines Box.Collides to avoid function call overhead and the
			// redundant Contains check that Box.Includes was doing.
			if (
				pageBounds !== undefined &&
				pageBounds.maxX >= viewMinX &&
				pageBounds.minX <= viewMaxX &&
				pageBounds.maxY >= viewMinY &&
				pageBounds.minY <= viewMaxY
			) {
				continue
			}

			// Shape is outside culling bounds or has no bounds - check if it can be culled.
			// We defer getShape and canCull checks until here since most shapes are
			// typically visible and we can skip these calls for them.
			const shape = editor.getShape(id)
			if (!shape) continue

			const canCull = editor.getShapeUtil(shape.type).canCull(shape)
			if (!canCull) continue

			nextValue.add(id)
		}

		if (isUninitialized(prevValue)) {
			return nextValue
		}

		// If there are more or less shapes, we know there's a change
		if (prevValue.size !== nextValue.size) {
			return nextValue
		}

		// If any of the old shapes are not in the new set, we know there's a change
		for (const prev of prevValue) {
			if (!nextValue.has(prev)) {
				return nextValue
			}
		}

		// If we've made it here, we know that the set is the same
		return prevValue
	})
}
