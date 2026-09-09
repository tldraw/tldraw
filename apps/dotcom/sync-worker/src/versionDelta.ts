import { RecordsDiff, UnknownRecord } from '@tldraw/store'
import {
	applyObjectDiff,
	getNetworkDiff,
	NetworkDiff,
	RecordOpType,
	RoomSnapshot,
} from '@tldraw/sync-core'
import { canonicalJson, fnv1a64 } from './snapshotUtils'

/**
 * One version of a board expressed as a change from the previous one.
 *
 * `getNetworkDiff` only covers `documents[].state`, so everything else a `RoomSnapshot` carries —
 * clocks, tombstones — is carried explicitly here. A field omitted from this envelope is a field
 * that silently reverts on restore.
 *
 * `schema` is deliberately absent: a schema change cuts a keyframe, so no chain spans one.
 *
 * `v` covers the embedded `NetworkDiff` semantics and the envelope hash's inputs as well as this
 * shape. v2: the hash canonicalizes exactly as `JSON.stringify` does (see `canonicalJson`).
 */
export interface SnapshotDelta {
	v: 2
	diff: NetworkDiff<UnknownRecord> | null
	clocks: Record<string, number>
	tombstones: { set: Record<string, number>; removed: string[] } | null
	tombstoneHistoryStartsAtClock?: number
	clock?: number
	documentClock?: number
	// Integrity hash of the snapshot this delta produces — see versionEnvelopeHash.
	hash: string
}

/**
 * Integrity hash of the whole version envelope: every record, every tombstone, and every room-level
 * clock a delta carries. Persisted in each delta and checked after replay, so its inputs are part
 * of the envelope format — changing them makes every chain already written unreadable, so a change
 * bumps `v`. (v1 hashed with a canonicalizer that kept `undefined` properties, which JSON
 * serialization drops.)
 *
 * Exists because `applyObjectDiff` is lenient — an Append with a stale offset or a Patch on a
 * missing key is silently skipped — so a subtly broken chain applies cleanly; this hash is what
 * turns "slightly wrong board" into an error. Order-independent: reconstruction rebuilds `documents`
 * in a different order than `getSnapshot()` emits and `applyObjectDiff` can reorder keys inside a
 * record, so per-record canonical hashes are XOR-combined rather than hashed in sequence.
 *
 * The room-level clocks are folded in as one labelled term rather than left out: they are optional
 * on `SnapshotDelta`, and `tombstoneHistoryStartsAtClock` in particular decides how far back
 * SQLiteSyncStorage believes deletions are tracked. Omitted from the hash, a delta that dropped one
 * would replay as `undefined` and still verify.
 */
export function versionEnvelopeHash(snapshot: RoomSnapshot): string {
	return snapshotHashes(snapshot).envelope
}

/** Both hashes of a snapshot from one pass over its records; see each accessor for what it means. */
export interface SnapshotHashes {
	envelope: string
	head: string
}

/**
 * Identity of a snapshot as a chain head: the envelope hash with `documentClock` left out. That
 * clock is the storage clock shared with the object lane, so a comment write moves it without
 * touching a document; persist skips that write on the fingerprint, and the snapshot seeded on the
 * next wake then carries a clock the head never saw. Compared on the envelope hash, that cut a
 * keyframe after every hibernation of a board with comments. Never persisted, so it can change
 * shape freely.
 */
export function chainHeadHash(snapshot: RoomSnapshot): string {
	return snapshotHashes(snapshot).head
}

/**
 * Computes `versionEnvelopeHash` and `chainHeadHash` together. Each walks every record through
 * `canonicalJson`, which on a large board is the bulk of a persist's CPU, and a write needs both of
 * the next snapshot — so callers on the persist path take this and read the pair.
 */
export function snapshotHashes(snapshot: RoomSnapshot): SnapshotHashes {
	let acc = 0n
	for (const { state, lastChangedClock } of snapshot.documents) {
		acc ^= BigInt('0x' + fnv1a64(canonicalJson(state) + '@' + lastChangedClock))
	}
	for (const [id, clock] of Object.entries(snapshot.tombstones ?? {})) {
		acc ^= BigInt('0x' + fnv1a64('tombstone:' + id + '@' + clock))
	}
	const clocksTerm = (clocks: Record<string, number | undefined>) =>
		BigInt('0x' + fnv1a64('clocks:' + canonicalJson(clocks)))
	const shared = {
		clock: snapshot.clock,
		tombstoneHistoryStartsAtClock: snapshot.tombstoneHistoryStartsAtClock,
	}
	return {
		envelope: (acc ^ clocksTerm({ ...shared, documentClock: snapshot.documentClock })).toString(16),
		head: (acc ^ clocksTerm(shared)).toString(16),
	}
}

export function buildSnapshotDelta(
	prev: RoomSnapshot,
	next: RoomSnapshot,
	options?: {
		/** `versionEnvelopeHash(next)`, when the caller already has it; computed here otherwise. */
		envelopeHash?: string
	}
): SnapshotDelta {
	const prevDocs = new Map(prev.documents.map((d) => [d.state.id, d]))
	const nextDocs = new Map(next.documents.map((d) => [d.state.id, d]))

	const recordsDiff: RecordsDiff<UnknownRecord> = { added: {}, updated: {}, removed: {} }
	const clocks: Record<string, number> = {}

	for (const [id, doc] of nextDocs) {
		const before = prevDocs.get(id)
		if (!before) {
			recordsDiff.added[id] = doc.state
			clocks[id] = doc.lastChangedClock
			continue
		}
		// An unmoved clock means unmoved content, so the deep diff is skipped. This holds only
		// because a schema change cuts a keyframe: migrateStorage can rewrite a record's shape
		// without touching its clock, and inside a chain that migration cannot have happened.
		if (before.lastChangedClock === doc.lastChangedClock) continue
		recordsDiff.updated[id] = [before.state, doc.state]
		clocks[id] = doc.lastChangedClock
	}

	for (const [id, doc] of prevDocs) {
		if (!nextDocs.has(id)) recordsDiff.removed[id] = doc.state
	}

	const prevTombstones = prev.tombstones ?? {}
	const nextTombstones = next.tombstones ?? {}
	const set: Record<string, number> = {}
	const removed: string[] = []
	for (const [id, clock] of Object.entries(nextTombstones)) {
		if (prevTombstones[id] !== clock) set[id] = clock
	}
	for (const id of Object.keys(prevTombstones)) {
		if (!(id in nextTombstones)) removed.push(id)
	}
	const tombstones = Object.keys(set).length === 0 && removed.length === 0 ? null : { set, removed }

	return {
		v: 2,
		diff: getNetworkDiff(recordsDiff),
		clocks,
		tombstones,
		tombstoneHistoryStartsAtClock: next.tombstoneHistoryStartsAtClock,
		clock: next.clock,
		documentClock: next.documentClock,
		hash: options?.envelopeHash ?? versionEnvelopeHash(next),
	}
}

export function applySnapshotDelta(prev: RoomSnapshot, delta: SnapshotDelta): RoomSnapshot {
	// The diff codec has changed semantics before (diffRecord's legacyAppendMode); applying a
	// future format with today's rules would corrupt quietly, which is worse than failing.
	if (delta.v !== 2) throw new Error(`unsupported snapshot delta version ${delta.v}, expected 2`)
	// The envelope hash would catch this too, as a mismatch; checked up front so a restore that
	// would seed the storage clock from `undefined` fails with a reason.
	if (typeof delta.documentClock !== 'number') {
		throw new Error('version delta is missing its documentClock')
	}
	// Keyed by plain string: the ids in a parsed delta lost their RecordId branding.
	const documents = new Map<string, { state: UnknownRecord; lastChangedClock: number }>(
		prev.documents.map((d) => [d.state.id as string, { ...d }])
	)

	for (const [id, op] of Object.entries(delta.diff ?? {})) {
		switch (op[0]) {
			case RecordOpType.Put:
				documents.set(id, { state: op[1], lastChangedClock: delta.clocks[id] ?? 0 })
				break
			case RecordOpType.Patch: {
				const existing = documents.get(id)
				// A patch against a record we don't have means the chain is broken. Reconstructing
				// around it would hand back a snapshot that is wrong rather than one that is missing.
				if (!existing) throw new Error(`version delta patches unknown record ${id}`)
				documents.set(id, {
					state: applyObjectDiff(existing.state, op[1]),
					lastChangedClock: delta.clocks[id] ?? existing.lastChangedClock,
				})
				break
			}
			case RecordOpType.Remove:
				// Same reasoning as Patch: buildSnapshotDelta only emits a Remove for a record the
				// previous state held, so one that deletes nothing means the base is not the state
				// this delta was diffed from.
				if (!documents.delete(id)) throw new Error(`version delta removes unknown record ${id}`)
				break
		}
	}

	for (const [id, clock] of Object.entries(delta.clocks)) {
		const existing = documents.get(id)
		if (existing) existing.lastChangedClock = clock
	}

	const tombstones = { ...(prev.tombstones ?? {}) }
	if (delta.tombstones) {
		for (const [id, clock] of Object.entries(delta.tombstones.set)) tombstones[id] = clock
		for (const id of delta.tombstones.removed) delete tombstones[id]
	}

	return {
		...prev,
		clock: delta.clock,
		documentClock: delta.documentClock,
		documents: [...documents.values()],
		tombstones,
		tombstoneHistoryStartsAtClock: delta.tombstoneHistoryStartsAtClock,
	}
}
