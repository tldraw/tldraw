import { RoomSnapshot } from '@tldraw/sync-core'
import { notFound } from '@tldraw/worker-shared'
import { IRequest } from 'itty-router'
import { getR2KeyForRoom } from '../r2'
import { Environment } from '../types'
import { isRoomIdTooLong, roomIdIsTooLong } from '../utils/roomIdIsTooLong'
import { requireAdminAccessToRequest } from '../utils/tla/getAuth'
import { isTestFile } from '../utils/tla/isTestFile'
import { decodeVersionBody } from '../versionChainCodec'
import { loadChainIndex, readSegmentDeltas, SegmentIndexEntry } from '../versionChainRead'
import { applySnapshotDelta, versionEnvelopeHash } from '../versionDelta'

export interface VerifyResult {
	replayed: number
	/** R2 reads spent, listing included. */
	reads: number
	/**
	 * False when the read budget stopped the walk with index entries still unvisited. On a room
	 * whose listing alone exhausts the budget, `mismatches` and `errors` come back empty having
	 * verified nothing — this is what says that result is not a clean room.
	 */
	complete: boolean
	/** Versions whose replayed state does not match the hash recorded with their delta. */
	mismatches: string[]
	/** Chain faults: a version that cannot be reconstructed from what is in the bucket. */
	errors: Array<{ timestamp: string; message: string }>
}

/**
 * Replays every chain in a room and checks each version against the hash recorded with its delta
 * (see versionEnvelopeHash), so a chain that would fail a history read is found before a read hits
 * it.
 *
 * A keyframe carries no recorded hash, so one with no deltas after it is checked only for decoding:
 * a keyframe that parses but holds the wrong board passes.
 */
export async function verifyRoomVersions({
	chainBucket,
	roomKey,
	limit,
}: {
	chainBucket: R2Bucket
	roomKey: string
	limit: number
}): Promise<VerifyResult> {
	const { entries, ops, rejected } = await loadChainIndex(chainBucket, roomKey)

	const mismatches: string[] = []
	const errors: Array<{ timestamp: string; message: string }> = []
	let replayed = 0
	// Flagged at the break sites, not derived from `reads >= limit` at the end: the budget may
	// overshoot on the version in flight, and a run that replayed everything is complete even so.
	let complete = true
	// Seeded with the listing: those pages are subrequests too, and on a room with a long history
	// they are a real share of the budget.
	let reads = ops
	// Checked between versions rather than in front of each read, so a run can overshoot by the two
	// reads one version costs. That is noise against the subrequest cap; an unbounded walk is not.
	const withinBudget = () => reads < limit

	// Each chain replays once, front to back, checking every intermediate state. Reconstructing per
	// version would refetch the same keyframe and segments once per version — quadratic over a
	// chain for no extra coverage, since this fold is exactly the fold reconstruction performs.
	//
	// Segments are grouped under their keyframe and ordered by sequence, exactly as reconstruction
	// orders them — never by key. Keys are wall-clock timestamps, and a durable object re-created
	// on a host whose clock runs behind opens a later segment under an earlier key; walking the
	// index in key order would fail the rollout gate on a chain that history reads serve fine.
	// Newest chain first: the budget bounds the work, and the versions a rollout gate must see are
	// the ones the current write path just produced. An active room writes ~2,000 versions a day,
	// so oldest-first would spend the whole budget on history and never reach today's code.
	const keyframes = entries
		.filter((entry) => entry.kind === 'keyframe')
		.sort((a, b) => b.key.localeCompare(a.key))

	// A segment whose keyframe is not in the index belongs to no walk below, so without this a
	// clean result would hide versions that 500 on read. Judged against the index rather than what
	// the walk claimed, and before the budget can stop anything: it costs no reads, and an early
	// break must not misreport unwalked segments as orphans.
	const keyframeKeys = new Set(keyframes.map((keyframe) => keyframe.key))
	for (const entry of entries) {
		if (entry.kind === 'segment' && !keyframeKeys.has(entry.keyframeKey)) {
			errors.push({
				timestamp: entry.timestamps[0],
				message: `segment ${entry.key} references missing keyframe ${entry.keyframeKey}`,
			})
		}
	}

	// The same class as the orphans above, one step earlier: these never reached the index, so the
	// check above cannot see them and the walk below never misses them. A rejected segment at the
	// end of a chain leaves no sequence gap behind it, which is exactly how an unreadable tail
	// passes as a clean room.
	for (const object of rejected) {
		errors.push({
			timestamp: object.timestamp,
			message: `segment ${object.key} has no readable chain reference`,
		})
	}

	for (const keyframe of keyframes) {
		if (!withinBudget()) {
			complete = false
			break
		}
		const segments = entries
			.filter(
				(entry): entry is SegmentIndexEntry =>
					entry.kind === 'segment' && entry.keyframeKey === keyframe.key
			)
			.sort((a, b) => a.firstSeq - b.firstSeq)

		let state: RoomSnapshot
		try {
			reads++
			const object = await chainBucket.get(keyframe.key)
			if (!object) throw new Error(`keyframe ${keyframe.key} is missing`)
			state = (await decodeVersionBody(object)) as RoomSnapshot
			replayed++
		} catch (e: any) {
			errors.push({ timestamp: keyframe.timestamps[0], message: String(e?.message ?? e) })
			continue
		}

		let expectedSeq = 1
		for (const segment of segments) {
			if (!withinBudget()) {
				complete = false
				break
			}
			try {
				if (segment.firstSeq !== expectedSeq) {
					throw new Error(
						`segment ${segment.key} expected at sequence ${expectedSeq}, found ${segment.firstSeq}`
					)
				}
				reads++
				// The same read as reconstruction, so a segment that verifies here also reads.
				const deltas = await readSegmentDeltas(chainBucket, segment)
				for (const { t, delta } of deltas) {
					if (!withinBudget()) {
						complete = false
						break
					}
					state = applySnapshotDelta(state, delta)
					replayed++
					if (delta.hash !== versionEnvelopeHash(state)) mismatches.push(t)
				}
				expectedSeq += segment.timestamps.length
			} catch (e: any) {
				errors.push({ timestamp: segment.timestamps[0], message: String(e?.message ?? e) })
				// A broken link invalidates every later state in this chain; the next keyframe
				// starts a fresh replay.
				break
			}
		}
	}

	return { replayed, reads, complete, mismatches, errors }
}

export async function verifyVersionChainRoute(
	request: IRequest,
	env: Environment,
	isApp: boolean
): Promise<Response> {
	const roomId = request.params.roomId
	if (!roomId) return notFound()
	if (isRoomIdTooLong(roomId)) return roomIdIsTooLong()

	await requireAdminAccessToRequest(request, env)

	if (isTestFile(roomId)) {
		return new Response('Not found', { status: 404 })
	}

	// R2 reads, not versions: an unbounded run walks into the per-invocation subrequest cap mid-way
	// and reports nothing. Capped below that limit rather than at it, to leave room for the reads
	// the last version in the budget is already spending.
	const requested = Number(request.query.limit ?? 200)
	const limit = Math.min(Number.isFinite(requested) && requested > 0 ? requested : 200, 900)
	const result = await verifyRoomVersions({
		chainBucket: env.ROOMS_HISTORY,
		roomKey: getR2KeyForRoom({ slug: roomId, isApp }),
		limit,
	})

	return new Response(JSON.stringify(result), {
		headers: { 'content-type': 'application/json' },
	})
}
