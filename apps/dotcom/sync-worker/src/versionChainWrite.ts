import { RoomSnapshot } from '@tldraw/sync-core'
import { getSnapshotFingerprint, getSnapshotMetadata } from './snapshotUtils'
import {
	ChainState,
	decideVersionWrite,
	KeyframeReason,
	PendingDelta,
	segmentCustomMetadata,
	versionKey,
} from './versionChain'
import { encodeVersionBody } from './versionChainCodec'
import { buildSnapshotDelta } from './versionDelta'

export interface VersionChainWriteResult {
	chain: ChainState
	/** The open segment's contents after this write — exactly what R2 now holds. */
	pending: PendingDelta[]
	wrote: 'keyframe' | 'delta'
	reason?: KeyframeReason
	bytes: number
}

export async function writeVersionChainEntry({
	bucket,
	roomKey,
	iso,
	chain,
	pending,
	previous,
	next,
	now,
}: {
	bucket: R2Bucket
	roomKey: string
	iso: string
	chain: ChainState | null
	pending: PendingDelta[]
	previous: RoomSnapshot | null
	next: RoomSnapshot
	now: number
}): Promise<VersionChainWriteResult> {
	const nextFingerprint = getSnapshotFingerprint(next)
	const customMetadata = getSnapshotMetadata(next)

	const delta = previous ? buildSnapshotDelta(previous, next) : null
	// Compressed on both sides of the size rule: comparing a raw delta against a compressed
	// keyframe would trip the ratio on boards that simply compress well.
	const encodedDelta = delta ? await encodeVersionBody(delta) : null
	const decision = decideVersionWrite({
		roomKey,
		iso,
		chain: previous && encodedDelta ? chain : null,
		previousFingerprint: previous ? getSnapshotFingerprint(previous) : nextFingerprint,
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
			openSegment: decision.segment,
		},
	}
}
