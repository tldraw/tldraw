import { SerializedSchema } from '@tldraw/store'
import { RoomSnapshot } from '@tldraw/sync-core'
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

// Narrows a board's document records to just what one render actually draws, so a pushed snapshot
// carries a cluster rather than the whole board. Pure: no env, no I/O, no editor.
//
// The size win is the reason this exists, but correctness is the reason it is written this way. A
// slice that drops a record something surviving still points at renders a *plausible* image —
// a board missing its arrows, a frame with no contents — which the pipeline would then cache as if
// it were right. That is worse than any slower path, so the slice verifies its own closure and
// returns nothing rather than a set it cannot vouch for. Callers turn that into a fallback to the
// pull path, which sends everything and cannot be wrong this way.

// Every record id a value points at, found by walking the value rather than by naming the fields
// that hold ids. An allowlist (`props.assetId`, `fromId`, `toId`) would silently miss any shape type
// whose props reference a record some other way — custom and embed shapes included, which this
// pipeline renders and which are exactly the content nobody tests a slice against. Over-keeping a
// record costs bytes, under-keeping one costs a wrong picture.
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

/**
 * Returns the records needed to render `pageId` — or, when `shapeIds` is given, just those shapes
 * and their descendants — closed over the bindings and assets they reference.
 *
 * Returns `null` when the slice cannot vouch for its output: a requested shape is not in the
 * snapshot, or a surviving record references a record that exists in `records` but did not make it
 * into the slice. A reference that is already dangling in the source is left alone, since sending
 * everything would render it identically.
 */
export function sliceSnapshotForRender(
	records: TLRecord[],
	{ pageId, shapeIds }: { pageId?: string; shapeIds?: string[] }
): TLRecord[] | null {
	// Nothing to narrow to: the caller wants the whole board, which is what it already has.
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

	// Roots: the named shapes, or every shape sitting directly on the page.
	const roots: TLShape[] = []
	if (shapeIds?.length) {
		for (const id of shapeIds) {
			const shape = byId.get(id)
			// A requested shape that is gone is the caller's problem to report, not something to
			// paper over by rendering the rest — the MCP tool would label the result with a cluster
			// it did not draw. getThumbnailSnapshot refuses the same case with a 404.
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

	// Ancestors of the kept shapes, so a cluster inside a frame keeps the frame it is positioned
	// against — shape coordinates are parent-relative, so dropping a parent moves its children.
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

	// Bindings with at least one end in the slice, and whatever shape sits at the other end. An
	// arrow's stored terminal is only refreshed when it is unbound in an editor, so an arrow whose
	// binding is dropped draws to wherever its handle was last dropped, not to the shape it points
	// at. Keeping the bound neighbour keeps the terminal honest: the export draws only the requested
	// shapes regardless, and a live capture deletes the neighbour in the page, which is the unbind
	// that moves the terminal. Bindings between two neighbours are not chased: nothing references a
	// binding, so leaving them out cannot break the closure.
	const bindings = records.filter(
		(record) => isBinding(record) && (kept.has(record.fromId) || kept.has(record.toId))
	)
	for (const record of bindings) {
		if (!isBinding(record)) continue
		for (const id of [record.fromId, record.toId]) {
			if (kept.has(id)) continue
			const neighbour = byId.get(id)
			if (!isShape(neighbour)) continue
			kept.set(neighbour.id, neighbour)
			keepAncestors(neighbour)
		}
	}
	const keptBindings = new Set(bindings.map((record) => record.id))

	// Assets referenced by anything kept so far.
	const referenced = new Set<string>()
	for (const record of [...kept.values(), ...bindings]) collectReferencedIds(record, referenced)

	// Everything the walk above did not decide gets KEPT, in source order. The types the slice
	// reasons about are dropped-by-default and earned their way back in (shapes via the walk,
	// bindings via an end, assets via a reference); every other type is kept-by-default, because
	// dropping a type this code has never heard of is exactly how a record that matters goes missing.
	// The concrete case that proved it: `user` records carry note-shape attribution, and the shape's
	// reference to one is a *bare* string (`textLastEditedBy`, no `user:` prefix) — invisible to the
	// reference walk and to assertClosed, so an enumerate-what-to-keep filter here lost the
	// attribution line with no error anywhere. Small types cost bytes to over-keep; the win lives in
	// shapes and assets.
	//
	// The one deliberate drop besides shapes/pages: comment records. They anchor to shapes by id, so
	// keeping them while slicing shapes would fail the closure check on any board with comments
	// outside the slice — and they contribute nothing to the export: comments are not shapes,
	// `editor.toImage` draws only shapes, and the render page mounts no comment UI. Pixel-identical
	// to the pull path, which sends them and renders them exactly as invisibly.
	const COMMENT_TYPES = new Set(['comment-thread', 'comment', 'comment-reaction'])
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
				return !COMMENT_TYPES.has(record.typeName)
		}
	})

	return isClosed(sliced, byId) ? sliced : null
}

// Verifies the slice references nothing it dropped. Deliberately independent of the collection
// above: it re-derives the references from the output rather than trusting the bookkeeping that
// produced it, so a bug in that bookkeeping surfaces here as a refusal instead of as a quietly
// incomplete picture.
function isClosed(sliced: TLRecord[], sourceById: Map<string, TLRecord>) {
	const slicedIds = new Set<string>(sliced.map((record) => record.id))
	const referenced = new Set<string>()
	for (const record of sliced) collectReferencedIds(record, referenced)

	for (const id of referenced) {
		if (slicedIds.has(id)) continue
		// Absent from the source too: already dangling before the slice touched it, so sending
		// everything would render exactly the same. Not ours to fail on.
		if (!sourceById.has(id)) continue
		return false
	}
	return true
}

/**
 * The records and schema to push for one render, or `undefined` when the slice could not vouch for
 * itself — in which case the caller renders through the fetch path, which sends everything and
 * cannot be incomplete.
 *
 * A `undefined` here is visible in telemetry without extra plumbing: MCP always attempts a push, so
 * a `transport:pull` row from `source:mcp` is a slice that refused.
 */
export function buildPushPayload(
	snapshot: RoomSnapshot,
	{ pageId, shapeIds }: { pageId?: string; shapeIds?: string[] }
): { records: TLRecord[]; schema: SerializedSchema } | undefined {
	// The same guard the snapshot route applies: a corrupt or partial R2 payload can carry schema
	// metadata without documents, or the reverse.
	if (!snapshot.schema || !snapshot.documents) return undefined

	const records = snapshot.documents.map((d) => d.state) as TLRecord[]
	const sliced = sliceSnapshotForRender(records, { pageId, shapeIds })
	return sliced ? { records: sliced, schema: snapshot.schema } : undefined
}

const SCRIPT_UNSAFE = /[<\u2028\u2029]/g
const SCRIPT_ESCAPES: Record<string, string> = {
	'<': '\\u003c',
	'\u2028': '\\u2028',
	'\u2029': '\\u2029',
}

/** Serializes a payload for injection into the render page as a `<script>` body. */
export function toRenderScriptLiteral(payload: unknown) {
	// One combined pass: per-character replaces would each scan and copy what can be tens of
	// megabytes of serialized snapshot.
	return JSON.stringify(payload).replace(SCRIPT_UNSAFE, (match) => SCRIPT_ESCAPES[match])
}
