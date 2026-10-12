import type { TLShapeId } from '@tldraw/tlschema'
import { stableSet } from '../../utils/stableSet'

// Pure culling set math. Editor reads the visible, selected and editing shapes through its own
// (overridable, reactive) methods and owns the cache field, so nothing in this file may read
// editor state.

/**
 * The shapes that should not render: those outside the viewport, minus the ones being edited or
 * selected.
 *
 * Passing the previously returned set lets an unchanged result keep its identity, so consumers can
 * compare with `===` and skip re-rendering.
 */
export function getCulledShapeIds(
	notVisibleShapeIds: Set<TLShapeId>,
	selectedShapeIds: TLShapeId[],
	editingShapeId: TLShapeId | null,
	previous: Set<TLShapeId> | null
): Set<TLShapeId> {
	const next = new Set<TLShapeId>(notVisibleShapeIds)

	// we don't cull the shape we are editing
	if (editingShapeId) {
		next.delete(editingShapeId)
	}

	// we also don't cull selected shapes
	selectedShapeIds.forEach((id) => {
		next.delete(id)
	})

	return stableSet(previous, next)
}
