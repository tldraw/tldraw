import { isSameFingerprint, SnapshotFingerprint } from './snapshotUtils'
import { SnapshotDelta } from './versionDelta'

/** One version inside a segment: the timestamp it was persisted at, and the change it encodes. */
export interface PendingDelta {
	t: string
	delta: SnapshotDelta
}

/** A segment object's body. Both the writer and the reader serialize this shape. */
export interface SegmentBody {
	v: 1
	deltas: PendingDelta[]
}

export const MAX_DELTAS_PER_CHAIN = 64
export const MAX_CHAIN_AGE_MS = 24 * 60 * 60 * 1000
export const MAX_DELTA_SIZE_RATIO = 0.5
/**
 * Deltas per segment object. Bounds three things at once: how much gets rewritten on each persist,
 * how many GETs a restore costs, and how many timestamps have to fit in R2 custom metadata. Much
 * above 32 and the metadata budget starts to bind.
 */
export const SEGMENT_CAP = 16

const KEYFRAME_SUFFIX = '.k'
const SEGMENT_SUFFIX = '.s'
const KEYFRAME_KEY_METADATA = 'keyframeKey'
const FIRST_SEQ_METADATA = 'firstSeq'
const TIMESTAMPS_METADATA = 'timestamps'

/** The segment currently being appended to, or null right after a keyframe. */
export interface OpenSegment {
	key: string
	firstSeq: number
	count: number
}

/**
 * What the version cache currently holds for a room, kept in DO storage so a chain survives the DO
 * going to sleep. `headFingerprint` is what makes that safe: if the document the DO loads on wake
 * isn't the one the chain ends at, the chain is not ours to append to.
 *
 * The open segment's *deltas* are not here — they live in the segment object in R2, which is what
 * lets a read path serve them without waking the durable object.
 */
export interface ChainState {
	keyframeKey: string
	keyframeAt: number
	keyframeBytes: number
	deltaCount: number
	headFingerprint: SnapshotFingerprint
	openSegment: OpenSegment | null
}

export type KeyframeReason =
	| 'no-chain'
	| 'fingerprint-mismatch'
	| 'schema-change'
	| 'delta-count'
	| 'chain-age'
	| 'delta-size'

export type VersionWriteDecision =
	| { kind: 'keyframe'; reason: KeyframeReason }
	| { kind: 'delta'; seq: number; segment: OpenSegment; isNewSegment: boolean }

export function decideVersionWrite({
	roomKey,
	iso,
	chain,
	loadedFingerprint,
	deltaBytes,
	now,
}: {
	roomKey: string
	iso: string
	chain: ChainState | null
	loadedFingerprint: SnapshotFingerprint
	deltaBytes: number
	now: number
}): VersionWriteDecision {
	if (!chain) return { kind: 'keyframe', reason: 'no-chain' }
	// Checked before the fingerprint as a whole so the metric distinguishes a migration from a
	// chain that lost track of its head — they call for different responses.
	if (chain.headFingerprint.schemaHash !== loadedFingerprint.schemaHash) {
		return { kind: 'keyframe', reason: 'schema-change' }
	}
	if (!isSameFingerprint(chain.headFingerprint, loadedFingerprint)) {
		return { kind: 'keyframe', reason: 'fingerprint-mismatch' }
	}
	if (chain.deltaCount >= MAX_DELTAS_PER_CHAIN) return { kind: 'keyframe', reason: 'delta-count' }
	if (now - chain.keyframeAt > MAX_CHAIN_AGE_MS) return { kind: 'keyframe', reason: 'chain-age' }
	// Stands in for a wipeAll signal, which persist has no access to, and also catches every other
	// mass rewrite. A delta this large is not worth chaining from.
	if (deltaBytes > chain.keyframeBytes * MAX_DELTA_SIZE_RATIO) {
		return { kind: 'keyframe', reason: 'delta-size' }
	}

	const seq = chain.deltaCount + 1
	const open = chain.openSegment
	if (!open || open.count >= SEGMENT_CAP) {
		// A full segment is finished by never being written to again — its key was its first
		// delta's timestamp from the start, so there is nothing to rename or seal.
		return {
			kind: 'delta',
			seq,
			isNewSegment: true,
			segment: { key: versionKey(roomKey, iso, 'segment'), firstSeq: seq, count: 1 },
		}
	}
	return {
		kind: 'delta',
		seq,
		isNewSegment: false,
		segment: { ...open, count: open.count + 1 },
	}
}

export function versionKey(roomKey: string, iso: string, kind: 'keyframe' | 'segment'): string {
	return `${roomKey}/${iso}${kind === 'keyframe' ? KEYFRAME_SUFFIX : SEGMENT_SUFFIX}`
}

/** Null for anything without a kind suffix — that's a legacy full-copy key, not a chain object. */
export function parseVersionKey(
	key: string
): { timestamp: string; kind: 'keyframe' | 'segment' } | null {
	const tail = key.slice(key.lastIndexOf('/') + 1)
	if (tail.endsWith(KEYFRAME_SUFFIX)) {
		return { timestamp: tail.slice(0, -KEYFRAME_SUFFIX.length), kind: 'keyframe' }
	}
	if (tail.endsWith(SEGMENT_SUFFIX)) {
		return { timestamp: tail.slice(0, -SEGMENT_SUFFIX.length), kind: 'segment' }
	}
	return null
}

/**
 * The versions a segment contains are listed here rather than derived from its key, because a
 * segment holds many versions and its key names only the first. `getRoomHistory` reads these
 * straight off a listing, so building a room's history stays one operation.
 */
export function segmentCustomMetadata({
	keyframeKey,
	firstSeq,
	timestamps,
}: {
	keyframeKey: string
	firstSeq: number
	timestamps: string[]
}): Record<string, string> {
	return {
		[KEYFRAME_KEY_METADATA]: keyframeKey,
		[FIRST_SEQ_METADATA]: String(firstSeq),
		[TIMESTAMPS_METADATA]: timestamps.join(','),
	}
}

export function readSegmentRef(
	metadata: Record<string, string> | undefined
): { keyframeKey: string; firstSeq: number; timestamps: string[] } | null {
	const keyframeKey = metadata?.[KEYFRAME_KEY_METADATA]
	const rawFirstSeq = metadata?.[FIRST_SEQ_METADATA]
	const rawTimestamps = metadata?.[TIMESTAMPS_METADATA]
	if (!keyframeKey || rawFirstSeq === undefined || !rawTimestamps) return null
	const firstSeq = Number(rawFirstSeq)
	if (!Number.isFinite(firstSeq)) return null
	return { keyframeKey, firstSeq, timestamps: rawTimestamps.split(',') }
}
