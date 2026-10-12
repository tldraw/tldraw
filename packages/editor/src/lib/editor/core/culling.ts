import type { TLShapeId } from '@tldraw/tlschema'

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

	return reuseSetIfUnchanged(previous, next)
}

/**
 * `previous` if it holds exactly the same members as `next`, otherwise `next`. Keeping the
 * identity of an unchanged set lets consumers compare with `===`.
 */
export function reuseSetIfUnchanged<T>(previous: Set<T> | null, next: Set<T>): Set<T> {
	if (!previous) return next

	// If sizes differ, contents must differ
	if (previous.size !== next.size) return next

	for (const id of previous) {
		if (!next.has(id)) return next
	}

	return previous
}
