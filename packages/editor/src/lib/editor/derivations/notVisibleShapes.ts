import { computed, isUninitialized } from '@tldraw/state'
import { TLShapeId } from '@tldraw/tlschema'
import type { Editor } from '../Editor'
import { ShapeUtil } from '../shapes/ShapeUtil'

/**
 * Non visible shapes are shapes outside of the viewport page bounds.
 *
 * @param editor - Instance of the tldraw Editor.
 * @returns Incremental derivation of non visible shapes.
 */
export function notVisibleShapes(editor: Editor) {
	const emptySet = new Set<TLShapeId>()
	const defaultCanCull = ShapeUtil.prototype.canCull

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

		const notVisibleIds = new Set<TLShapeId>()
		for (const id of allShapeIds) {
			if (visibleIds.has(id)) continue

			// Peek at the shape without subscribing — we only need its type to look up the util.
			// Type is treated as immutable for a given id, so this is safe.
			const peek = editor.store.unsafeGetWithoutCapture(id)
			if (!peek) continue
			const util = editor.getShapeUtil(peek.type)

			// If canCull is the default (always-true), skip per-shape subscription entirely.
			// >99% of shapes hit this path in practice.
			if (util.canCull === defaultCanCull) {
				notVisibleIds.add(id)
				continue
			}

			// Custom canCull — subscribe so prop flips invalidate this derivation.
			const shape = editor.getShape(id)
			if (!shape) continue
			if (!util.canCull(shape)) continue
			notVisibleIds.add(id)
		}

		// First run
		if (isUninitialized(prevValue)) {
			return notVisibleIds
		}

		// Reuse prev set when contents are unchanged
		if (notVisibleIds.size === prevValue.size) {
			let same = true
			for (const id of notVisibleIds) {
				if (!prevValue.has(id)) {
					same = false
					break
				}
			}
			if (same) return prevValue
		}

		return notVisibleIds
	})
}
