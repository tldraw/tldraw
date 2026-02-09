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
	return computed<Set<TLShapeId>>('notVisibleShapes', function (prevValue) {
		const allShapeIds = editor.getCurrentPageShapeIds()
		const viewportPageBounds = editor.getViewportPageBounds()
		const visibleIds = editor.getShapeIdsInsideBounds(viewportPageBounds)

		const nextValue = new Set<TLShapeId>()

		// Non-visible shapes are all shapes minus visible shapes
		for (const id of allShapeIds) {
			if (!visibleIds.has(id)) {
				const shape = editor.getShape(id)
				if (!shape) continue

				const canCull = editor.getShapeUtil(shape.type).canCull(shape)
				if (!canCull) continue

				nextValue.add(id)
			}
		}

		if (isUninitialized(prevValue) || prevValue.size !== nextValue.size) {
			return nextValue
		}

		for (const prev of prevValue) {
			if (!nextValue.has(prev)) return nextValue
		}

		return prevValue
	})
}
