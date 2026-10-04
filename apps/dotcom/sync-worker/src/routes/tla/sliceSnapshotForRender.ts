import {
	AssetRecordType,
	TLRecord,
	TLShape,
	isBinding,
	isBindingId,
	isPageId,
	isShape,
	isShapeId,
} from '@tldraw/tlschema'
import { getHashForString } from '@tldraw/utils'

// Narrows a board's records to what one render draws. A slice missing a record that something kept
// still points at renders a plausible but wrong image — arrows gone, an empty frame — which then
// gets cached. So the slice checks its own closure and returns null instead, and callers send the
// whole board.

// Walks the whole value for ids rather than naming the fields that hold them: an allowlist would
// miss custom and embed shapes that reference records some other way. Over-keeping costs bytes;
// under-keeping costs a wrong picture.
function collectReferencedIds(value: unknown, into: Set<string>) {
	if (typeof value === 'string') {
		if (isShapeId(value) || isBindingId(value) || isPageId(value) || AssetRecordType.isId(value)) {
			into.add(value)
		}
		return
	}
	if (Array.isArray(value)) {
		for (const item of value) collectReferencedIds(item, into)
		return
	}
	if (value && typeof value === 'object') {
		for (const item of Object.values(value)) collectReferencedIds(item, into)
	}
}

// The records needed to render `pageId`, or just `shapeIds` and their descendants, closed over
// their ancestors, bindings, bound neighbours and assets. Null when a requested shape is missing or
// the output references a source record it dropped.
export function sliceSnapshotForRender(
	records: TLRecord[],
	{ pageId, shapeIds }: { pageId?: string; shapeIds?: string[] }
): TLRecord[] | null {
	if (!pageId && !shapeIds?.length) return records

	const byId = new Map<string, TLRecord>()
	for (const record of records) byId.set(record.id, record)

	const childrenByParent = new Map<string, TLShape[]>()
	for (const record of records) {
		if (!isShape(record)) continue
		const siblings = childrenByParent.get(record.parentId)
		if (siblings) siblings.push(record)
		else childrenByParent.set(record.parentId, [record])
	}

	const roots: TLShape[] = []
	if (shapeIds?.length) {
		for (const id of shapeIds) {
			const shape = byId.get(id)
			// Rendering the rest would label the result with a cluster it did not draw.
			if (!isShape(shape)) return null
			roots.push(shape)
		}
	} else if (pageId) {
		roots.push(...(childrenByParent.get(pageId) ?? []))
	}

	// Walk down: a frame or group without its children renders as an empty box.
	const kept = new Map<string, TLShape>()
	const queue = [...roots]
	while (queue.length) {
		const shape = queue.pop()!
		if (kept.has(shape.id)) continue
		kept.set(shape.id, shape)
		const children = childrenByParent.get(shape.id)
		if (children) queue.push(...children)
	}

	// Coordinates are parent-relative, so dropping a frame would move its children.
	const keepAncestors = (shape: TLShape) => {
		let parentId: string = shape.parentId
		while (!kept.has(parentId)) {
			const parent = byId.get(parentId)
			if (!isShape(parent)) break
			kept.set(parent.id, parent)
			parentId = parent.parentId
		}
	}
	for (const shape of [...kept.values()]) keepAncestors(shape)

	// An arrow's stored terminal only moves when it is unbound in an editor, so an arrow whose binding
	// is dropped draws to a stale point. Keeping the bound neighbour lets the export draw it right, and
	// live capture's prune does the unbind. Neighbour-to-neighbour bindings aren't needed: nothing
	// references a binding.
	const bindings = records
		.filter(isBinding)
		.filter((record) => kept.has(record.fromId) || kept.has(record.toId))
	for (const record of bindings) {
		for (const id of [record.fromId, record.toId]) {
			if (kept.has(id)) continue
			const neighbour = byId.get(id)
			if (!isShape(neighbour)) continue
			kept.set(neighbour.id, neighbour)
			keepAncestors(neighbour)
		}
	}
	const keptBindings = new Set(bindings.map((record) => record.id))

	const referenced = new Set<string>()
	for (const record of [...kept.values(), ...bindings]) collectReferencedIds(record, referenced)
	// A bookmark with no assetId still draws the asset its url hashes to (getResolvedBookmarkAssetId),
	// which the id walk can't see. Without this, those bookmarks render as bare cards.
	for (const shape of kept.values()) {
		const props = shape.props as { assetId?: unknown; url?: unknown }
		if (shape.type === 'bookmark' && !props.assetId && typeof props.url === 'string' && props.url) {
			referenced.add(AssetRecordType.createId(getHashForString(props.url)))
		}
	}

	// Types not decided above are kept: dropping an unknown type is how a record that matters goes
	// missing. Note attribution reads `user` records through a bare `textLastEditedBy` string that
	// neither the walk nor isClosed can see.
	const sliced = records.filter((record) => {
		switch (record.typeName) {
			case 'shape':
				return kept.has(record.id)
			case 'binding':
				return keptBindings.has(record.id)
			case 'asset':
				return referenced.has(record.id)
			case 'page':
				return pageId ? record.id === pageId : true
			default:
				return true
		}
	})

	return isClosed(sliced, byId) ? sliced : null
}

// Re-derives references from the output rather than trusting the bookkeeping above, so a bug there
// becomes a refusal instead of an incomplete picture.
function isClosed(sliced: TLRecord[], sourceById: Map<string, TLRecord>) {
	const slicedIds = new Set<string>(sliced.map((record) => record.id))
	const referenced = new Set<string>()
	for (const record of sliced) collectReferencedIds(record, referenced)

	for (const id of referenced) {
		if (slicedIds.has(id)) continue
		// Already dangling in the source; the whole board renders the same.
		if (!sourceById.has(id)) continue
		return false
	}
	return true
}
