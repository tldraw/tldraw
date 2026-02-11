import { computed, isUninitialized } from '@tldraw/state'
import { TLShape, TLShapeId } from '@tldraw/tlschema'
import { Editor } from '../Editor'

/**
 * Non visible shapes are shapes outside of the viewport page bounds.
 *
 * @param editor - Instance of the tldraw Editor.
 * @returns Incremental derivation of non visible shapes.
 */
export function notVisibleShapes(editor: Editor) {
	const emptySet = new Set<TLShapeId>()

	return computed<Set<TLShapeId>>('notVisibleShapes', function (prevValue) {
		const allShapes = editor.getCurrentPageShapes()
		const viewportPageBounds = editor.getViewportPageBounds()
		const visibleIds = editor.getShapeIdsInsideBounds(viewportPageBounds)

		let shape: TLShape | undefined

		// Fast path: if all shapes are visible, return empty set
		if (visibleIds.size === allShapes.length) {
			if (isUninitialized(prevValue) || prevValue.size > 0) {
				return emptySet
			}
			return prevValue
		}

		// First run: compute from scratch
		if (isUninitialized(prevValue)) {
			const nextValue = new Set<TLShapeId>()
			for (let i = 0; i < allShapes.length; i++) {
				shape = allShapes[i]
				if (visibleIds.has(shape.id)) continue
				if (!editor.getShapeUtil(shape.type).canCull(shape)) continue
				nextValue.add(shape.id)
			}
			return nextValue
		}

		// Subsequent runs: single pass to collect IDs and detect changes
		const notVisibleIds: TLShapeId[] = []
		for (let i = 0; i < allShapes.length; i++) {
			shape = allShapes[i]
			if (visibleIds.has(shape.id)) continue
			if (!editor.getShapeUtil(shape.type).canCull(shape)) continue
			notVisibleIds.push(shape.id)
		}

		// Check if the result changed
		if (notVisibleIds.length === prevValue.size) {
			let same = true
			for (let i = 0; i < notVisibleIds.length; i++) {
				if (!prevValue.has(notVisibleIds[i])) {
					same = false
					break
				}
			}
			if (same) return prevValue
		}

		return new Set(notVisibleIds)
	})
}
