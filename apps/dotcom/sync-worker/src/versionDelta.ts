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
 */
export interface SnapshotDelta {
	v: 1
	diff: NetworkDiff<UnknownRecord> | null
	clocks: Record<string, number>
	tombstones: { set: Record<string, number>; removed: string[] } | null
	tombstoneHistoryStartsAtClock?: number
	clock?: number
	documentClock?: number
	// Content hash of the resulting snapshot — see snapshotContentHash for why it exists.
	hash: string
}

/**
 * Order-independent content hash of a snapshot's document lane. Reconstruction rebuilds
 * `documents` in a different order than `getSnapshot()` emits and `applyObjectDiff` can reorder
 * keys inside a record, so per-record canonical hashes are XOR-combined rather than hashed in
 * sequence. Exists because `applyObjectDiff` is lenient — an Append with a stale offset or a
 * Patch on a missing key is silently skipped — so a subtly broken chain applies cleanly; this
 * hash is what turns "slightly wrong board" into an error.
 */
export function snapshotContentHash(snapshot: RoomSnapshot): string {
	let acc = 0n
	for (const { state, lastChangedClock } of snapshot.documents) {
		acc ^= BigInt('0x' + fnv1a64(canonicalJson(state) + '@' + lastChangedClock))
	}
	for (const [id, clock] of Object.entries(snapshot.tombstones ?? {})) {
		acc ^= BigInt('0x' + fnv1a64('tombstone:' + id + '@' + clock))
	}
	return acc.toString(16)
}

export function buildSnapshotDelta(prev: RoomSnapshot, next: RoomSnapshot): SnapshotDelta {
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
		v: 1,
		diff: getNetworkDiff(recordsDiff),
		clocks,
		tombstones,
		tombstoneHistoryStartsAtClock: next.tombstoneHistoryStartsAtClock,
		clock: next.clock,
		documentClock: next.documentClock,
		hash: snapshotContentHash(next),
	}
}

export function applySnapshotDelta(prev: RoomSnapshot, delta: SnapshotDelta): RoomSnapshot {
	// The diff codec has changed semantics before (diffRecord's legacyAppendMode); applying a
	// future format with today's rules would corrupt quietly, which is worse than failing.
	if (delta.v !== 1) throw new Error(`unknown snapshot delta version ${delta.v}`)
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
				documents.delete(id)
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
