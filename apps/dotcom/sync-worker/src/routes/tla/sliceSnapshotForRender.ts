import { SerializedSchema } from '@tldraw/store'
import { RoomSnapshot } from '@tldraw/sync-core'
import { TLRecord } from '@tldraw/tlschema'

// Narrows a board's document records to just what one render actually draws, so a pushed snapshot
// carries a cluster rather than the whole board. Pure: no env, no I/O, no editor.
//
// The size win is the reason this exists, but correctness is the reason it is written this way. A
// slice that drops a record something surviving still points at renders a *plausible* image —
// a board missing its arrows, a frame with no contents — which the pipeline would then cache as if
// it were right. That is worse than any slower path, so the slice verifies its own closure and
// throws rather than returning a set it cannot vouch for. Callers turn that into a fallback to the
// pull path, which sends everything and cannot be wrong this way.

/** Thrown when the slice cannot vouch for its own output. Callers fall back to sending everything. */
export class SnapshotSliceError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'SnapshotSliceError'
	}
}

function isShape(record: TLRecord) {
	return record.typeName === 'shape'
}

// Every id a record points at, found by walking its values rather than by naming the fields that
// hold them. An allowlist (`props.assetId`, `fromId`, `toId`) would be shorter and would silently
// miss any shape type whose props reference a record some other way — including custom and embed
// shapes, which this pipeline renders and which are exactly the content nobody tests a slice
// against. Prefix-matching every string is broader than needed and that is the point: over-keeping
// a record costs bytes, under-keeping one costs a wrong picture.
function collectReferencedIds(value: unknown, into: Set<string>) {
	if (typeof value === 'string') {
		// Record ids are `<typeName>:<uuid>`. Matching the prefixes we care about keeps ordinary
		// strings (a shape's text, a bookmark's url) from being mistaken for references.
		if (/^(shape|asset|binding|page):/.test(value)) into.add(value)
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
 * Throws `SnapshotSliceError` if the result is not closed: if any surviving record references a
 * record that exists in `records` but did not make it into the slice. A reference that is already
 * dangling in the source is left alone, since sending everything would render it identically.
 */
export function sliceSnapshotForRender(
	records: TLRecord[],
	{ pageId, shapeIds }: { pageId?: string; shapeIds?: string[] }
): TLRecord[] {
	// Nothing to narrow to: the caller wants the whole board, which is what it already has.
	if (!pageId && !shapeIds?.length) return records

	const byId = new Map<string, TLRecord>()
	for (const record of records) byId.set(record.id, record)

	const childrenByParent = new Map<string, TLRecord[]>()
	for (const record of records) {
		if (!isShape(record)) continue
		const parentId = (record as { parentId?: string }).parentId
		if (!parentId) continue
		const siblings = childrenByParent.get(parentId)
		if (siblings) siblings.push(record)
		else childrenByParent.set(parentId, [record])
	}

	// Roots: the named shapes, or every shape sitting directly on the page.
	const roots: TLRecord[] = []
	if (shapeIds?.length) {
		for (const id of shapeIds) {
			const shape = byId.get(id)
			// A requested shape that is gone is the caller's problem to report, not something to
			// paper over by rendering the rest — the MCP tool would label the result with a cluster
			// it did not draw. getThumbnailSnapshot refuses the same case with a 404.
			if (!shape || !isShape(shape)) {
				throw new SnapshotSliceError(`Requested shape ${id} is not in the snapshot`)
			}
			roots.push(shape)
		}
	} else if (pageId) {
		roots.push(...(childrenByParent.get(pageId) ?? []))
	}

	// Walk down: a frame or group without its children renders as an empty box.
	const kept = new Map<string, TLRecord>()
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
	for (const shape of [...kept.values()]) {
		let parentId = (shape as { parentId?: string }).parentId
		while (parentId && !kept.has(parentId)) {
			const parent = byId.get(parentId)
			if (!parent || !isShape(parent)) break
			kept.set(parent.id, parent)
			parentId = (parent as { parentId?: string }).parentId
		}
	}

	// Bindings: keep one only when both ends survive. A half-bound arrow is worse than no arrow —
	// the editor would resolve the missing end to nothing and draw it somewhere arbitrary.
	const bindings = records.filter((record) => {
		if (record.typeName !== 'binding') return false
		const { fromId, toId } = record as unknown as { fromId: string; toId: string }
		return kept.has(fromId) && kept.has(toId)
	})

	// Assets referenced by anything kept so far.
	const referenced = new Set<string>()
	for (const record of [...kept.values(), ...bindings]) collectReferencedIds(record, referenced)
	const keptBindings = new Set(bindings.map((record) => record.id))

	// Everything the walk above did not decide gets KEPT, in source order. The types the slice
	// reasons about are dropped-by-default and earned their way back in (shapes via the walk,
	// bindings via both ends, assets via a reference); every other type is kept-by-default, because
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

	assertClosed(sliced, byId)
	return sliced
}

// Verifies the slice references nothing it dropped. Deliberately independent of the collection
// above: it re-derives the references from the output rather than trusting the bookkeeping that
// produced it, so a bug in that bookkeeping surfaces here as a thrown error instead of as a
// quietly incomplete picture.
function assertClosed(sliced: TLRecord[], sourceById: Map<string, TLRecord>) {
	const slicedIds = new Set<string>(sliced.map((record) => record.id))
	const referenced = new Set<string>()
	for (const record of sliced) collectReferencedIds(record, referenced)

	for (const id of referenced) {
		if (slicedIds.has(id)) continue
		// Absent from the source too: already dangling before the slice touched it, so sending
		// everything would render exactly the same. Not ours to fail on.
		if (!sourceById.has(id)) continue
		throw new SnapshotSliceError(`Slice dropped ${id}, which a surviving record still references`)
	}
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
	try {
		return {
			records: sliceSnapshotForRender(records, { pageId, shapeIds }),
			schema: snapshot.schema,
		}
	} catch (error) {
		if (error instanceof SnapshotSliceError) return undefined
		throw error
	}
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
