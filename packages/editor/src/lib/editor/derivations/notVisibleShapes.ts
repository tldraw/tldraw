import { computed, isUninitialized } from '@tldraw/state'
import { TLShapeId } from '@tldraw/tlschema'
import { Editor } from '../Editor'

function fromScratch(editor: Editor): Set<TLShapeId> {
	const shapesIds = editor.getCurrentPageShapeIds()
	const viewportPageBounds = editor.getViewportPageBounds()
	const notVisibleShapes = new Set<TLShapeId>()
	shapesIds.forEach((id) => {
		const shape = editor.getShape(id)
		if (!shape) return

		const canCull = editor.getShapeUtil(shape.type).canCull(shape)
		if (!canCull) return

		// If the shape is fully outside of the viewport page bounds, add it to the set.
		// We'll ignore masks here, since they're more expensive to compute and the overhead is not worth it.
		const pageBounds = editor.getShapePageBounds(id)
		if (pageBounds === undefined || !viewportPageBounds.includes(pageBounds)) {
			notVisibleShapes.add(id)
		}
	})
	return notVisibleShapes
}

/**
 * Incremental derivation of not visible shapes.
 * Non visible shapes are shapes outside of the viewport page bounds.
 *
 * @param editor - Instance of the tldraw Editor.
 * @returns Incremental derivation of non visible shapes.
 */
export function notVisibleShapes(editor: Editor) {
	return computed<Set<TLShapeId>>('notVisibleShapes', function updateNotVisibleShapes(prevValue) {
		const nextValue = fromScratch(editor)

		if (isUninitialized(prevValue)) {
			return nextValue
		}

		// If there are more or less shapes, we know there's a change
		if (prevValue.size !== nextValue.size) return nextValue

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
