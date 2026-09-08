import { UnknownRecord } from '@tldraw/store'
import { RoomSnapshot } from '@tldraw/sync-core'
import { describe, expect, it } from 'vitest'
import {
	MAX_CHAIN_AGE_MS,
	MAX_DELTAS_PER_CHAIN,
	SEGMENT_CAP,
	WORKER_MAX_SIMULTANEOUS_CONNECTIONS,
} from './config'
import { getSnapshotFingerprint, SnapshotFingerprint } from './snapshotUtils'
import {
	ChainState,
	decideVersionWrite,
	isChainHead,
	parseVersionKey,
	readSegmentRef,
	segmentCustomMetadata,
	versionKey,
} from './versionChain'
import { chainHeadHash } from './versionDelta'

const roomKey = 'app_rooms/slug'
const fingerprint: SnapshotFingerprint = { lastDocumentChangeClock: 10, schemaHash: 'abc' }
const now = 1_000_000
const iso = '2026-09-01T00:00:05.000Z'

function chain(partial: Partial<ChainState> = {}): ChainState {
	return {
		keyframeKey: `${roomKey}/2026-09-01T00:00:00.000Z.k`,
		keyframeAt: now,
		keyframeBytes: 1_000_000,
		deltaCount: 0,
		headFingerprint: fingerprint,
		headHash: 'h0',
		openSegment: null,
		...partial,
	}
}

function decide(partial: Partial<ChainState> | null, overrides: Record<string, unknown> = {}) {
	return decideVersionWrite({
		roomKey,
		iso,
		chain: partial === null ? null : chain(partial),
		previousFingerprint: fingerprint,
		previousHash: 'h0',
		nextFingerprint: fingerprint,
		deltaBytes: 10,
		now,
		...overrides,
	} as any)
}

describe('decideVersionWrite', () => {
	it('cuts a keyframe when there is no chain', () => {
		expect(decide(null)).toEqual({ kind: 'keyframe', reason: 'no-chain' })
	})

	it('reports the caller-named reason when a discarded chain left no chain', () => {
		expect(decide(null, { noChainReason: 'segment-lost' })).toEqual({
			kind: 'keyframe',
			reason: 'segment-lost',
		})
	})

	it('cuts a keyframe when the incoming snapshot moved the schema hash', () => {
		expect(
			decide({}, { nextFingerprint: { lastDocumentChangeClock: 11, schemaHash: 'different' } })
		).toEqual({ kind: 'keyframe', reason: 'schema-change' })
	})

	it('cuts a keyframe when the diff base is not the chain head', () => {
		expect(
			decide({}, { previousFingerprint: { lastDocumentChangeClock: 99, schemaHash: 'abc' } })
		).toEqual({ kind: 'keyframe', reason: 'fingerprint-mismatch' })
	})

	it('cuts a keyframe when the diff base has the right fingerprint but different content', () => {
		// Tombstone pruning is the known way to get here: clocks unmoved, tombstones rewritten.
		expect(decide({}, { previousHash: 'different' })).toEqual({
			kind: 'keyframe',
			reason: 'content-mismatch',
		})
	})

	it('cuts a keyframe at the delta count limit', () => {
		expect(decide({ deltaCount: MAX_DELTAS_PER_CHAIN })).toEqual({
			kind: 'keyframe',
			reason: 'delta-count',
		})
	})

	it('cuts a keyframe once the chain is a day old', () => {
		expect(decide({}, { now: now + MAX_CHAIN_AGE_MS + 1 })).toEqual({
			kind: 'keyframe',
			reason: 'chain-age',
		})
	})

	it('cuts a keyframe when a large delta is more than half the keyframe', () => {
		expect(decide({ keyframeBytes: 10_000 }, { deltaBytes: 5_001 })).toEqual({
			kind: 'keyframe',
			reason: 'delta-size',
		})
	})

	it('cuts a keyframe when the open segment would outgrow its keyframe', () => {
		const openSegment = {
			key: `${roomKey}/2026-09-01T00:00:01.000Z.s`,
			firstSeq: 1,
			count: 3,
			bytes: 9_000,
		}

		expect(
			decide({ deltaCount: 3, keyframeBytes: 10_000, openSegment }, { deltaBytes: 1_001 })
		).toEqual({ kind: 'keyframe', reason: 'segment-size' })
		expect(
			decide({ deltaCount: 3, keyframeBytes: 10_000, openSegment }, { deltaBytes: 1_000 })
		).toEqual({ kind: 'delta', seq: 4, isNewSegment: false, segment: { ...openSegment, count: 4 } })
	})

	it('never cuts a segment size keyframe for a tiny segment, whatever the ratio', () => {
		const openSegment = {
			key: `${roomKey}/2026-09-01T00:00:01.000Z.s`,
			firstSeq: 1,
			count: 3,
			bytes: 3_000,
		}

		expect(decide({ deltaCount: 3, keyframeBytes: 100, openSegment }, { deltaBytes: 500 })).toEqual(
			{
				kind: 'delta',
				seq: 4,
				isNewSegment: false,
				segment: { ...openSegment, count: 4 },
			}
		)
	})

	it('never cuts a size keyframe for a small delta, whatever the ratio', () => {
		expect(decide({ keyframeBytes: 100 }, { deltaBytes: 90 })).toEqual({
			kind: 'delta',
			seq: 1,
			isNewSegment: true,
			segment: { key: `${roomKey}/${iso}.s`, firstSeq: 1, count: 1 },
		})
	})

	it('opens a segment keyed at this version when there is none', () => {
		expect(decide({ deltaCount: 0, openSegment: null })).toEqual({
			kind: 'delta',
			seq: 1,
			isNewSegment: true,
			segment: { key: `${roomKey}/${iso}.s`, firstSeq: 1, count: 1 },
		})
	})

	it('appends to the open segment while it has room', () => {
		const openSegment = { key: `${roomKey}/2026-09-01T00:00:01.000Z.s`, firstSeq: 1, count: 3 }

		expect(decide({ deltaCount: 3, openSegment })).toEqual({
			kind: 'delta',
			seq: 4,
			isNewSegment: false,
			segment: { ...openSegment, count: 4 },
		})
	})

	it('opens a fresh segment once the current one is full', () => {
		const openSegment = {
			key: `${roomKey}/2026-09-01T00:00:01.000Z.s`,
			firstSeq: 1,
			count: SEGMENT_CAP,
		}

		expect(decide({ deltaCount: SEGMENT_CAP, openSegment })).toEqual({
			kind: 'delta',
			seq: SEGMENT_CAP + 1,
			isNewSegment: true,
			segment: { key: `${roomKey}/${iso}.s`, firstSeq: SEGMENT_CAP + 1, count: 1 },
		})
	})
})

describe('isChainHead', () => {
	function snapshot(partial: Partial<RoomSnapshot> = {}): RoomSnapshot {
		return {
			clock: 5,
			documentClock: 5,
			documents: [
				{ state: { id: 'shape:a', typeName: 'shape' } as UnknownRecord, lastChangedClock: 5 },
			],
			tombstones: { 'shape:old': 3 },
			tombstoneHistoryStartsAtClock: 0,
			schema: { schemaVersion: 2, sequences: {} } as any,
			...partial,
		}
	}
	const head = snapshot()
	const chainAtHead = chain({
		headFingerprint: getSnapshotFingerprint(head),
		headHash: chainHeadHash(head),
	})

	it('accepts the head itself and a head whose shared clock a comment write moved', () => {
		expect(isChainHead(chainAtHead, head)).toBe(true)
		expect(isChainHead(chainAtHead, snapshot({ documentClock: 9 }))).toBe(true)
	})

	it('rejects a tombstone prune, which keeps the fingerprint but not the content', () => {
		const pruned = snapshot({ tombstones: {}, tombstoneHistoryStartsAtClock: 4 })

		expect(getSnapshotFingerprint(pruned)).toEqual(getSnapshotFingerprint(head))
		expect(isChainHead(chainAtHead, pruned)).toBe(false)
	})

	it('rejects a document change', () => {
		const edited = snapshot({
			documents: [
				{
					state: { id: 'shape:a', typeName: 'shape', x: 1 } as unknown as UnknownRecord,
					lastChangedClock: 6,
				},
			],
		})

		expect(isChainHead(chainAtHead, edited)).toBe(false)
	})
})

describe('tuning invariants', () => {
	it('keeps a restore fan-out within the simultaneous connection limit', () => {
		// Keyframe plus every segment of a full chain, fetched in parallel by reconstructVersion.
		const fanOut = 1 + Math.ceil(MAX_DELTAS_PER_CHAIN / SEGMENT_CAP)

		expect(fanOut).toBeLessThanOrEqual(WORKER_MAX_SIMULTANEOUS_CONNECTIONS)
	})
})

describe('version keys', () => {
	it('round-trips both kinds', () => {
		const k = versionKey(roomKey, '2026-09-01T00:00:00.000Z', 'keyframe')
		const seg = versionKey(roomKey, '2026-09-01T00:00:01.000Z', 'segment')

		expect(k).toBe(`${roomKey}/2026-09-01T00:00:00.000Z.k`)
		expect(parseVersionKey(k)).toEqual({ timestamp: '2026-09-01T00:00:00.000Z', kind: 'keyframe' })
		expect(parseVersionKey(seg)).toEqual({
			timestamp: '2026-09-01T00:00:01.000Z',
			kind: 'segment',
		})
	})

	it('sorts chronologically regardless of kind', () => {
		const keys = [
			versionKey('r', '2026-09-01T00:00:02.000Z', 'segment'),
			versionKey('r', '2026-09-01T00:00:01.000Z', 'keyframe'),
			versionKey('r', '2026-09-01T00:00:03.000Z', 'segment'),
		]

		expect([...keys].sort()).toEqual([keys[1], keys[0], keys[2]])
	})

	it('returns null for a legacy key with no kind suffix', () => {
		expect(parseVersionKey(`${roomKey}/2026-09-01T00:00:00.000Z`)).toBeNull()
	})
})

describe('segment metadata', () => {
	it('round-trips the chain reference and the contained timestamps', () => {
		const timestamps = ['2026-09-01T00:00:01.000Z', '2026-09-01T00:00:02.000Z']
		const metadata = segmentCustomMetadata({
			keyframeKey: `${roomKey}/2026-09-01T00:00:00.000Z.k`,
			firstSeq: 1,
			timestamps,
		})

		expect(readSegmentRef(metadata)).toEqual({
			keyframeKey: `${roomKey}/2026-09-01T00:00:00.000Z.k`,
			firstSeq: 1,
			timestamps,
		})
	})

	it('stays inside R2 metadata limits at the segment cap', () => {
		const timestamps = Array.from(
			{ length: SEGMENT_CAP },
			(_, i) => `2026-09-01T00:00:${String(i).padStart(2, '0')}.000Z`
		)
		const metadata = segmentCustomMetadata({
			keyframeKey: `${roomKey}/2026-09-01T00:00:00.000Z.k`,
			firstSeq: 1,
			timestamps,
		})
		const size = Object.entries(metadata).reduce((n, [k, v]) => n + k.length + v.length, 0)

		expect(size).toBeLessThan(2048)
	})

	it('returns null when the reference is missing or unparseable', () => {
		expect(readSegmentRef(undefined)).toBeNull()
		expect(readSegmentRef({ keyframeKey: 'k' })).toBeNull()
		expect(readSegmentRef({ keyframeKey: 'k', firstSeq: 'x', timestamps: 'a' })).toBeNull()
	})

	it('refuses a sequence that only coerces to a number', () => {
		// Number('') is 0, which is finite — a truncated value must not read as sequence zero.
		expect(readSegmentRef({ keyframeKey: 'k', firstSeq: '', timestamps: 'a' })).toBeNull()
		expect(readSegmentRef({ keyframeKey: 'k', firstSeq: ' 2 ', timestamps: 'a' })).toBeNull()
		expect(readSegmentRef({ keyframeKey: 'k', firstSeq: '0', timestamps: 'a' })).toBeNull()
		expect(readSegmentRef({ keyframeKey: 'k', firstSeq: '0x2', timestamps: 'a' })).toBeNull()
	})
})
