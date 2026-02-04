import { computed, isUninitialized } from '@tldraw/state'
import { TLShapeId } from '@tldraw/tlschema'
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
		const allShapeIds = editor.getCurrentPageShapeIds()
		const viewportPageBounds = editor.getViewportPageBounds()
		const visibleIds = editor.getShapeIdsInsideBounds(viewportPageBounds)

		// Fast path: if all shapes are visible, return empty set
		if (visibleIds.size === allShapeIds.size) {
			if (isUninitialized(prevValue) || prevValue.size > 0) {
				return emptySet
			}
			return prevValue
		}

		// First run: compute from scratch
		if (isUninitialized(prevValue)) {
			const nextValue = new Set<TLShapeId>()
			for (const id of allShapeIds) {
				if (visibleIds.has(id)) continue

				const shape = editor.getShape(id)
				if (!shape) continue

				if (!editor.getShapeUtil(shape.type).canCull(shape)) continue

				nextValue.add(id)
			}
			return nextValue
		}

		// Subsequent runs: check if result differs before creating new Set
		let count = 0
		let hasDiff = false

		for (const id of allShapeIds) {
			if (visibleIds.has(id)) continue

			const shape = editor.getShape(id)
			if (!shape) continue

			if (!editor.getShapeUtil(shape.type).canCull(shape)) continue

			count++
			if (!hasDiff && !prevValue.has(id)) {
				hasDiff = true
			}
		}

		// Check if size changed
		if (!hasDiff && prevValue.size !== count) {
			hasDiff = true
		}

		// If nothing changed, return the previous value
		if (!hasDiff) {
			return prevValue
		}

		// Build the new Set (only when needed)
		const nextValue = new Set<TLShapeId>()
		for (const id of allShapeIds) {
			if (visibleIds.has(id)) continue

			const shape = editor.getShape(id)
			if (!shape) continue

			if (!editor.getShapeUtil(shape.type).canCull(shape)) continue

			nextValue.add(id)
		}

		return nextValue
	})
}
