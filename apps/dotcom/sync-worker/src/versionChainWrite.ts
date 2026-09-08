import { RoomSnapshot } from '@tldraw/sync-core'
import { getSnapshotFingerprint, getSnapshotMetadata } from './snapshotUtils'
import {
	ChainState,
	decideVersionWrite,
	KeyframeReason,
	PendingDelta,
	SegmentBody,
	segmentCustomMetadata,
	versionKey,
} from './versionChain'
import { decodeVersionBody, encodeVersionBody } from './versionChainCodec'
import { buildSnapshotDelta, chainHeadHash, snapshotHashes } from './versionDelta'

interface VersionChainWriteResultBase {
	chain: ChainState
	/** The open segment's contents after this write — exactly what R2 now holds. */
	pending: PendingDelta[]
	bytes: number
}

export type VersionChainWriteResult =
	| (VersionChainWriteResultBase & { wrote: 'keyframe'; reason: KeyframeReason })
	| (VersionChainWriteResultBase & { wrote: 'delta' })

export async function writeVersionChainEntry({
	bucket,
	roomKey,
	iso,
	chain,
	noChainReason,
	pending,
	previous,
	previousHeadHash,
	next,
	now,
}: {
	bucket: R2Bucket
	roomKey: string
	iso: string
	chain: ChainState | null
	noChainReason?: 'no-chain' | 'segment-lost'
	pending: PendingDelta[]
	previous: RoomSnapshot | null
	/**
	 * `chainHeadHash(previous)`, when the caller kept it from the write that produced `previous`
	 * (it is that write's `chain.headHash`); computed here otherwise. Trusted as given: a wrong value
	 * cuts a content-mismatch keyframe, never a bad delta.
	 */
	previousHeadHash?: string
	next: RoomSnapshot
	now: number
}): Promise<VersionChainWriteResult> {
	const nextFingerprint = getSnapshotFingerprint(next)
	const customMetadata = getSnapshotMetadata(next)
	// One pass for both hashes of `next`: the delta records the envelope hash and the chain head
	// records the head hash, and on a large board each pass is a canonicalization of every record.
	const nextHashes = snapshotHashes(next)

	const delta = previous
		? buildSnapshotDelta(previous, next, { envelopeHash: nextHashes.envelope })
		: null
	// Compressed on both sides of the size rule: comparing a raw delta against a compressed
	// keyframe would trip the ratio on boards that simply compress well.
	const encodedDelta = delta ? await encodeVersionBody(delta) : null
	const decision = decideVersionWrite({
		roomKey,
		iso,
		chain: previous && encodedDelta ? chain : null,
		noChainReason,
		previousFingerprint: previous ? getSnapshotFingerprint(previous) : nextFingerprint,
		// The hash is what actually pins the diff base: tombstone pruning can change content
		// without moving the fingerprint.
		previousHash: previous ? (previousHeadHash ?? chainHeadHash(previous)) : '',
		nextFingerprint,
		deltaBytes: encodedDelta?.body.byteLength ?? 0,
		now,
	})

	if (decision.kind === 'keyframe') {
		const key = versionKey(roomKey, iso, 'keyframe')
		const encoded = await encodeVersionBody(next)
		await bucket.put(key, encoded.body, {
			customMetadata: { ...customMetadata, ...encoded.metadata },
		})
		return {
			wrote: 'keyframe',
			reason: decision.reason,
			bytes: encoded.body.byteLength,
			pending: [],
			chain: {
				keyframeKey: key,
				keyframeAt: now,
				keyframeBytes: encoded.body.byteLength,
				deltaCount: 0,
				headFingerprint: nextFingerprint,
				headHash: nextHashes.head,
				openSegment: null,
			},
		}
	}

	// A new segment starts from this delta alone; an existing one is rewritten with everything it
	// already held plus this delta. R2 bills the operation, not the bytes uploaded, so the rewrite
	// costs the same single Class A op either way and only the final body is stored.
	const deltas = decision.isNewSegment
		? [{ t: iso, delta: delta! }]
		: [...pending, { t: iso, delta: delta! }]
	const encoded = await encodeVersionBody({ v: 1 as const, deltas })

	await bucket.put(decision.segment.key, encoded.body, {
		customMetadata: {
			...customMetadata,
			...encoded.metadata,
			...segmentCustomMetadata({
				keyframeKey: chain!.keyframeKey,
				firstSeq: decision.segment.firstSeq,
				timestamps: deltas.map((d) => d.t),
			}),
		},
	})

	// Only now, after the PUT resolved: the buffer has to stay exactly what R2 holds, or a retry
	// would rewrite the segment without a delta it already contains.
	return {
		wrote: 'delta',
		bytes: encoded.body.byteLength,
		pending: deltas,
		chain: {
			...chain!,
			deltaCount: decision.seq,
			headFingerprint: nextFingerprint,
			headHash: nextHashes.head,
			openSegment: { ...decision.segment, bytes: encoded.body.byteLength },
		},
	}
}

/**
 * The deltas an open segment holds, for a durable object that lost its in-memory buffer, or null
 * when the object cannot be used as one: missing, undecodable, or not a v1 segment body.
 *
 * Null means the segment is unusable and the caller starts a fresh chain, which costs one keyframe.
 * A failed `get` throws instead: the segment may be intact and only the network was not, and null
 * here would silently discard it on every blip. The caller retries transient errors and lets a
 * persistent failure fail the chain write, which has its own fallback. (A blip while reading the
 * body still decodes as null — rare enough that the keyframe is fine.)
 */
export async function readOpenSegment(
	bucket: R2Bucket,
	key: string
): Promise<PendingDelta[] | null> {
	const object = await bucket.get(key)
	if (!object) return null
	try {
		const body = (await decodeVersionBody(object)) as Partial<SegmentBody> | null
		if (body?.v !== 1 || !Array.isArray(body.deltas)) return null
		return body.deltas
	} catch {
		return null
	}
}
