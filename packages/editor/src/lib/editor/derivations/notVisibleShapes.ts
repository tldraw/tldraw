import { computed, isUninitialized } from '@tldraw/state'
import { TLShapeId } from '@tldraw/tlschema'
import { Editor } from '../Editor'

/**
 * Incremental derivation of not visible shapes.
 * Non visible shapes are shapes outside of the viewport page bounds.
 *
 * @param editor - Instance of the tldraw Editor.
 * @returns Incremental derivation of non visible shapes.
 */
export function notVisibleShapes(editor: Editor) {
	return computed<Set<TLShapeId>>('notVisibleShapes', function updateNotVisibleShapes(prevValue) {
		const shapesIds = editor.getCurrentPageShapeIds()
		const viewportPageBounds = editor.getViewportPageBounds()
		const notVisibleShapes = new Set<TLShapeId>()

		// const then = performance.now()
		for (const id of shapesIds) {
			// If the shape is fully outside of the viewport page bounds, add it to the set.
			// We'll ignore masks here, since they're more expensive to compute and the overhead is not worth it.
			const pageBounds = editor.getShapePageBounds(id)
			if (pageBounds === undefined || !viewportPageBounds.includes(pageBounds)) {
				notVisibleShapes.add(id)
			}
		}

		// const now = performance.now()
		// console.log('notVisibleShapes', now - then)

		if (isUninitialized(prevValue)) {
			return notVisibleShapes
		}

		// If there are more or less shapes, we know there's a change
		if (prevValue.size !== notVisibleShapes.size) return notVisibleShapes

		// If any of the old shapes are not in the new set, we know there's a change
		for (const prev of prevValue) {
			if (!notVisibleShapes.has(prev)) {
				return notVisibleShapes
			}
		}

		// If we've made it here, we know that the set is the same
		return prevValue
	})
}
