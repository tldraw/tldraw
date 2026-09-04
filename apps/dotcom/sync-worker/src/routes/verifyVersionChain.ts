import { RoomSnapshot } from '@tldraw/sync-core'
import { notFound } from '@tldraw/worker-shared'
import { IRequest } from 'itty-router'
import { getR2KeyForRoom } from '../r2'
import { canonicalJson } from '../snapshotUtils'
import { Environment } from '../types'
import { isRoomIdTooLong, roomIdIsTooLong } from '../utils/roomIdIsTooLong'
import { requireAdminAccessToRequest } from '../utils/tla/getAuth'
import { SegmentBody } from '../versionChain'
import { decodeVersionBody } from '../versionChainCodec'
import { loadChainIndex, SegmentIndexEntry } from '../versionChainRead'
import { applySnapshotDelta, snapshotContentHash } from '../versionDelta'

export interface VerifyResult {
	/** Versions compared against a legacy full copy. Zero once dual-write is off. */
	checked: number
	/** Versions replayed, whether or not a legacy copy existed to compare them against. */
	replayed: number
	/**
	 * R2 reads spent, listing included. At the limit the run stopped early, so a clean result is
	 * evidence about the versions it reached and about nothing else.
	 */
	reads: number
	mismatches: string[]
	errors: Array<{ timestamp: string; message: string }>
}

/**
 * Compares every reconstructable version against the full copy dual-write left in the legacy
 * bucket. This is the gate on turning the full copies off — until it runs clean on live traffic,
 * the only evidence the encoding is exact comes from a 16-room sample.
 *
 * It keeps running after cut-over on the recorded hash alone, which is why `limit` counts R2 reads
 * and not comparisons: with no legacy copies left to compare against, a comparison counter never
 * moves and the walk would never stop.
 */
export async function verifyRoomVersions({
	chainBucket,
	legacyBucket,
	roomKey,
	limit,
}: {
	chainBucket: R2Bucket
	legacyBucket: R2Bucket
	roomKey: string
	limit: number
}): Promise<VerifyResult> {
	const { entries, ops } = await loadChainIndex(chainBucket, roomKey)

	// A set: a version can fail both the hash check and the legacy comparison, and it is one
	// mismatch, not two.
	const mismatches = new Set<string>()
	const errors: Array<{ timestamp: string; message: string }> = []
	let checked = 0
	let replayed = 0
	// Seeded with the listing: those pages are subrequests too, and on a room with a long history
	// they are a real share of the budget.
	let reads = ops
	// Checked between versions rather than in front of each read, so a run can overshoot by the two
	// reads one version costs. That is noise against the subrequest cap; an unbounded walk is not.
	const withinBudget = () => reads < limit

	const compareToLegacy = async (snapshot: RoomSnapshot, timestamp: string) => {
		reads++
		const legacyObject = await legacyBucket.get(`${roomKey}/${timestamp}`)
		// Nothing to compare against for versions written before dual-write started, or for any
		// version at all once it stops.
		if (!legacyObject) return
		checked++
		const expected = (await decodeVersionBody(legacyObject)) as RoomSnapshot
		if (canonical(snapshot) !== canonical(expected)) mismatches.add(timestamp)
	}

	// Each chain replays once, front to back, comparing every intermediate state against the
	// legacy full copy at the same timestamp. Reconstructing per version would refetch the same
	// keyframe and segments once per version — quadratic over a chain for no extra coverage,
	// since this fold is exactly the fold reconstruction performs.
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
	for (const keyframe of keyframes) {
		if (!withinBudget()) break
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
			await compareToLegacy(state, keyframe.timestamps[0])
		} catch (e: any) {
			errors.push({ timestamp: keyframe.timestamps[0], message: String(e?.message ?? e) })
			continue
		}

		let expectedSeq = 1
		for (const segment of segments) {
			if (!withinBudget()) break
			try {
				if (segment.firstSeq !== expectedSeq) {
					throw new Error(
						`segment ${segment.key} expected at sequence ${expectedSeq}, found ${segment.firstSeq}`
					)
				}
				reads++
				const object = await chainBucket.get(segment.key)
				if (!object) throw new Error(`segment ${segment.key} disappeared`)
				const body = (await decodeVersionBody(object)) as SegmentBody
				for (const { t, delta } of body.deltas) {
					if (!withinBudget()) break
					state = applySnapshotDelta(state, delta)
					replayed++
					// Intra-chain check, independent of the legacy copies — after cut-over the
					// recorded hash is the only witness (see snapshotContentHash).
					if (delta.hash !== snapshotContentHash(state)) mismatches.add(t)
					await compareToLegacy(state, t)
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

	return { checked, replayed, reads, mismatches: [...mismatches], errors }
}

/** Record order is unstable between persists, so compare content and not serialization order. */
function canonical(snapshot: RoomSnapshot): string {
	return JSON.stringify({
		clock: snapshot.clock,
		documentClock: snapshot.documentClock,
		// The schema decides how a restore migrates, so a reconstruction that dropped or swapped
		// it must read as a mismatch, not a pass.
		schema: canonicalJson(snapshot.schema ?? null),
		tombstoneHistoryStartsAtClock: snapshot.tombstoneHistoryStartsAtClock,
		tombstones: Object.fromEntries(Object.entries(snapshot.tombstones ?? {}).sort()),
		documents: [...snapshot.documents]
			.sort((a, b) => String(a.state.id).localeCompare(String(b.state.id)))
			.map((d) => [d.state.id, d.lastChangedClock, canonicalJson(d.state)]),
	})
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

	// R2 reads, not versions: an unbounded run walks into the per-invocation subrequest cap mid-way
	// and reports nothing. Capped below that limit rather than at it, to leave room for the reads
	// the last version in the budget is already spending.
	const requested = Number(request.query.limit ?? 200)
	const limit = Math.min(Number.isFinite(requested) && requested > 0 ? requested : 200, 900)
	const result = await verifyRoomVersions({
		chainBucket: env.ROOMS_HISTORY,
		legacyBucket: env.ROOMS_HISTORY_EPHEMERAL,
		roomKey: getR2KeyForRoom({ slug: roomId, isApp }),
		limit,
	})

	return new Response(JSON.stringify(result), {
		headers: { 'content-type': 'application/json' },
	})
}
