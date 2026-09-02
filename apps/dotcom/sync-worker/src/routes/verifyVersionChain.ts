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
import { loadChainIndex } from '../versionChainRead'
import { applySnapshotDelta, snapshotContentHash } from '../versionDelta'

export interface VerifyResult {
	checked: number
	mismatches: string[]
	errors: Array<{ timestamp: string; message: string }>
}

/**
 * Compares every reconstructable version against the full copy dual-write left in the legacy
 * bucket. This is the gate on turning the full copies off — until it runs clean on live traffic,
 * the only evidence the encoding is exact comes from a 16-room sample.
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
	const { entries } = await loadChainIndex(chainBucket, roomKey)

	// A set: a version can fail both the hash check and the legacy comparison, and it is one
	// mismatch, not two.
	const mismatches = new Set<string>()
	const errors: Array<{ timestamp: string; message: string }> = []
	let checked = 0

	const compareToLegacy = async (snapshot: RoomSnapshot, timestamp: string) => {
		const legacyObject = await legacyBucket.get(`${roomKey}/${timestamp}`)
		// Nothing to compare against for versions written before dual-write started.
		if (!legacyObject) return
		checked++
		const expected = (await decodeVersionBody(legacyObject)) as RoomSnapshot
		if (canonical(snapshot) !== canonical(expected)) mismatches.add(timestamp)
	}

	// Each chain replays once, front to back, comparing every intermediate state against the
	// legacy full copy at the same timestamp. Reconstructing per version would refetch the same
	// keyframe and segments once per version — quadratic over a chain for no extra coverage,
	// since this fold is exactly the fold reconstruction performs.
	let state: RoomSnapshot | null = null
	let keyframeKey: string | null = null
	let expectedSeq = 1

	for (const entry of entries) {
		if (checked >= limit) break
		try {
			if (entry.kind === 'keyframe') {
				const object = await chainBucket.get(entry.key)
				if (!object) throw new Error(`keyframe ${entry.key} is missing`)
				state = (await decodeVersionBody(object)) as RoomSnapshot
				keyframeKey = entry.key
				expectedSeq = 1
				await compareToLegacy(state, entry.timestamps[0])
				continue
			}
			if (!state || entry.keyframeKey !== keyframeKey || entry.firstSeq !== expectedSeq) {
				throw new Error(`segment ${entry.key} does not chain from the last keyframe`)
			}
			const object = await chainBucket.get(entry.key)
			if (!object) throw new Error(`segment ${entry.key} disappeared`)
			const body = (await decodeVersionBody(object)) as SegmentBody
			for (const { t, delta } of body.deltas) {
				state = applySnapshotDelta(state, delta)
				// Intra-chain check, independent of the legacy copies — after cut-over the recorded
				// hash is the only witness (see snapshotContentHash).
				if (delta.hash !== snapshotContentHash(state)) mismatches.add(t)
				await compareToLegacy(state, t)
			}
			expectedSeq += entry.timestamps.length
		} catch (e: any) {
			errors.push({ timestamp: entry.timestamps[0], message: String(e?.message ?? e) })
			// A broken link invalidates every later state in this chain. Stay dark until the next
			// keyframe resynchronizes the replay.
			state = null
			keyframeKey = null
		}
	}

	return { checked, mismatches: [...mismatches], errors }
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

	const limit = Number(request.query.limit ?? 200)
	const result = await verifyRoomVersions({
		chainBucket: env.ROOMS_HISTORY,
		legacyBucket: env.ROOMS_HISTORY_EPHEMERAL,
		roomKey: getR2KeyForRoom({ slug: roomId, isApp }),
		limit: Number.isFinite(limit) ? limit : 200,
	})

	return new Response(JSON.stringify(result), {
		headers: { 'content-type': 'application/json' },
	})
}
