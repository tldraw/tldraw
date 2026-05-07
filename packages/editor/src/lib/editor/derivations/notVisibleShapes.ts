import { computed, isUninitialized } from '@tldraw/state'
import { TLShape, TLShapeId } from '@tldraw/tlschema'
import type { Editor } from '../Editor'

/**
 * Non visible shapes are shapes outside of the viewport page bounds.
 *
 * @param editor - Instance of the tldraw Editor.
 * @returns Incremental derivation of non visible shapes.
 */
export function notVisibleShapes(editor: Editor) {
	const emptySet = new Set<TLShapeId>()

	return computed<Set<TLShapeId>>('notVisibleShapes', function (prevValue) {
		// Subscribed deps (rebuilt on each run by the signals tracker):
		//  - getCurrentPageShapeIds: incremental, only invalidates on
		//    add/remove/reparent
		//  - getViewportPageBounds: invalidates on pan/zoom
		//  - getShapeIdsInsideBounds: subscribes to the spatial index epoch,
		//    which only ticks when a shape's bounds actually change
		//  - editor.getShape(id) in the slow path below: per-shape
		//    subscription, but only for shapes that are read there — i.e.
		//    offscreen ones. This is required so canCull() overrides driven
		//    by prop changes (e.g. a shape with `preventCulling`) re-run
		//    this derivation. Onscreen shapes are short-circuited out
		//    before the read, so the current run never subscribes to them
		//    and their prop changes don't invalidate the derivation.
		// We deliberately do NOT subscribe to getCurrentPageShapes() — its
		// invalidation on every shape prop change would re-run this
		// derivation any time any shape's props changed, including the many
		// onscreen ones.
		const allShapeIds = editor.getCurrentPageShapeIds()
		const viewportPageBounds = editor.getViewportPageBounds()
		const visibleIds = editor.getShapeIdsInsideBounds(viewportPageBounds)

		// Fast path: if all shapes are visible, return empty set.
		if (visibleIds.size === allShapeIds.size) {
			if (isUninitialized(prevValue) || prevValue.size > 0) {
				return emptySet
			}
			return prevValue
		}

		// Slow path: collect not-visible ids, checking canCull per shape.
		// editor.getShape subscribes per-shape — required so prop-driven
		// canCull overrides invalidate this derivation. We only reach this
		// path for offscreen shapes, so the active draw shape (which is
		// onscreen) is never subscribed to here.
		const notVisibleIds: TLShapeId[] = []
		let shape: TLShape | undefined
		for (const id of allShapeIds) {
			if (visibleIds.has(id)) continue
			shape = editor.getShape(id)
			if (!shape) continue
			if (!editor.getShapeUtil(shape.type).canCull(shape)) continue
			notVisibleIds.push(id)
		}

		// First run: build from scratch.
		if (isUninitialized(prevValue)) {
			return new Set(notVisibleIds)
		}

		// Subsequent runs: only allocate a new Set when the contents differ.
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
