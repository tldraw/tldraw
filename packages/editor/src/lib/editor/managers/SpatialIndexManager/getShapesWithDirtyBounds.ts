import type { RecordsDiff } from '@tldraw/store'
import { TLShape, TLShapeId, isBinding, isPageId, isShape } from '@tldraw/tlschema'
import type { TLRecord } from '@tldraw/tlschema'
import { objectMapValues } from '@tldraw/utils'
import type { Editor } from '../../Editor'

/**
 * Expand shape and binding record diffs into the shapes whose page-space bounds (or anything
 * derived from them, like masked bounds) may have changed. Derived-bounds changes (arrows
 * following bound shapes, groups resizing with children, children moving or being clipped with
 * their ancestors) are tracked structurally, so callers recheck O(affected) shapes rather than
 * every shape on the page.
 *
 * Known limitation: a custom shape whose geometry reads other shapes outside the parent/child
 * and binding relationships, or reads other state, is not included when those change. Core
 * shapes only depend on other shapes via bindings (arrows) and parent/child relationships
 * (groups, frames).
 *
 * Its reads would capture a dependency per visited shape, so call it inside
 * `unsafe__withoutCapture`.
 *
 * @returns `dirty`: existing or just-added shapes to recheck. `removed`: shapes that a diff
 * removed; one may also be in `dirty` if a later diff re-added it.
 *
 * @internal
 */
export function getShapesWithDirtyBounds(
	editor: Editor,
	shapeDiff: RecordsDiff<TLRecord>[],
	bindingDiff: RecordsDiff<TLRecord>[]
): { dirty: Set<TLShapeId>; removed: Set<TLShapeId> } {
	const removed = new Set<TLShapeId>()
	// Shapes whose page transform may have moved (their record was added or
	// updated). Their descendants' transforms move with them.
	const transformChanged = new Set<TLShapeId>()
	// Shapes whose page bounds need rechecking.
	const dirty = new Set<TLShapeId>()
	// Subset of `dirty` not yet expanded into ancestors/binding partners.
	const queue: TLShapeId[] = []

	const markDirty = (id: TLShapeId) => {
		if (!dirty.has(id)) {
			dirty.add(id)
			queue.push(id)
		}
	}

	// Step 1: seed the dirty set from the record diffs.
	for (const changes of shapeDiff) {
		for (const shape of objectMapValues(changes.added) as TLShape[]) {
			if (!isShape(shape)) continue
			transformChanged.add(shape.id)
			markDirty(shape.id)
		}

		for (const shape of objectMapValues(changes.removed) as TLShape[]) {
			if (!isShape(shape)) continue
			removed.add(shape.id)
			// The old parent's derived bounds (groups) may shrink. Bindings
			// involving the shape are deleted in the same transaction, so the
			// binding diff below dirties the other ends.
			if (!isPageId(shape.parentId)) markDirty(shape.parentId)
		}

		for (const [from, to] of objectMapValues(changes.updated) as [TLShape, TLShape][]) {
			if (!isShape(to)) continue
			transformChanged.add(to.id)
			markDirty(to.id)
			// On reparent, the old ancestor chain needs rechecking too
			if (isShape(from) && from.parentId !== to.parentId && !isPageId(from.parentId)) {
				markDirty(from.parentId)
			}
		}
	}

	for (const changes of bindingDiff) {
		for (const binding of objectMapValues(changes.added)) {
			if (!isBinding(binding)) continue
			markDirty(binding.fromId)
			markDirty(binding.toId)
		}
		for (const binding of objectMapValues(changes.removed)) {
			if (!isBinding(binding)) continue
			markDirty(binding.fromId)
			markDirty(binding.toId)
		}
		for (const [from, to] of objectMapValues(changes.updated)) {
			if (!isBinding(to)) continue
			markDirty(to.fromId)
			markDirty(to.toId)
			// A reassigned binding leaves its old endpoints needing a
			// recheck too (mirrors the reparent case for shapes above).
			if (isBinding(from) && (from.fromId !== to.fromId || from.toId !== to.toId)) {
				markDirty(from.fromId)
				markDirty(from.toId)
			}
		}
	}

	// Step 2: a moved record moves the page transforms of all its
	// descendants, so their bounds need rechecking even though their
	// records never changed. Expand before the fixpoint below so each
	// descendant also gets its ancestors and binding partners visited.
	const transformQueue = [...transformChanged]
	while (transformQueue.length) {
		const id = transformQueue.pop()!
		for (const childId of editor.getSortedChildIdsForParent(id)) {
			if (!transformChanged.has(childId)) {
				transformChanged.add(childId)
				transformQueue.push(childId)
			}
			markDirty(childId)
		}
	}

	// Step 3: expand to a fixpoint. Any shape whose bounds may have changed
	// can resize its ancestor groups and move arrows bound to it. A derived
	// bounds change does not move the shape's own transform, so descendants
	// are not affected by this expansion (only by step 2).
	while (queue.length) {
		const id = queue.pop()!

		const record = editor.store.unsafeGetWithoutCapture(id)
		if (record && isShape(record) && !isPageId(record.parentId)) {
			markDirty(record.parentId)
		}

		for (const binding of editor.getBindingsInvolvingShape(id)) {
			markDirty(binding.fromId)
			markDirty(binding.toId)
		}
	}

	return { dirty, removed }
}
