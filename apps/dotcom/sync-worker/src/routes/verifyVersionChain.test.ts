import { UnknownRecord } from '@tldraw/store'
import { RoomSnapshot } from '@tldraw/sync-core'
import { IRequest } from 'itty-router'
import { describe, expect, it, vi } from 'vitest'
import { createFakeR2 } from '../test/fakeR2'
import { Environment } from '../types'
import { ChainState, PendingDelta, segmentCustomMetadata, versionKey } from '../versionChain'
import { decodeVersionBody, encodeVersionBody } from '../versionChainCodec'
import { writeVersionChainEntry } from '../versionChainWrite'
import { buildSnapshotDelta } from '../versionDelta'
import { verifyRoomVersions, verifyVersionChainRoute } from './verifyVersionChain'

vi.mock('../utils/tla/getAuth', () => ({ requireAdminAccessToRequest: vi.fn() }))

const roomKey = 'app_rooms/slug'

function snapshot(clock: number, ids: string[]): RoomSnapshot {
	return {
		clock,
		documentClock: clock,
		documents: ids.map((id) => ({
			state: { id, typeName: 'shape' } as UnknownRecord,
			lastChangedClock: clock,
		})),
		tombstones: {},
		tombstoneHistoryStartsAtClock: 0,
		schema: { schemaVersion: 2, sequences: {} } as any,
	}
}

async function seedChain(chainBucket: R2Bucket, versions: RoomSnapshot[]) {
	let chain: ChainState | null = null
	let pending: PendingDelta[] = []

	for (let i = 0; i < versions.length; i++) {
		const iso = `2026-09-01T00:00:0${i}.000Z`
		const result = await writeVersionChainEntry({
			bucket: chainBucket,
			roomKey,
			iso,
			chain,
			pending,
			previous: i === 0 ? null : versions[i - 1],
			next: versions[i],
			now: i * 1000,
		})
		chain = result.chain
		pending = result.pending
	}
}

/** Rewrites the hash recorded with the delta at `t`, as a delta that replays wrong would leave it. */
async function tamperRecordedHash(chainBucket: R2Bucket, segmentKey: string, t: string) {
	const object = (await chainBucket.get(segmentKey))!
	const body = (await decodeVersionBody(object)) as any
	for (const entry of body.deltas) {
		if (entry.t === t) entry.delta = { ...entry.delta, hash: 'tampered' }
	}
	const encoded = await encodeVersionBody(body)
	await chainBucket.put(segmentKey, encoded.body, {
		customMetadata: { ...object.customMetadata, ...encoded.metadata },
	})
}

describe('verifyRoomVersions under clock skew', () => {
	it('verifies a chain whose later segment has an earlier key', async () => {
		const chainBucket = createFakeR2()
		const versions = [
			snapshot(1, ['shape:a']),
			snapshot(2, ['shape:a', 'shape:b']),
			snapshot(3, ['shape:a', 'shape:b', 'shape:c']),
		]
		const iso = (s: number) => `2026-09-01T00:00:${String(s).padStart(2, '0')}.000Z`
		const keyframeKey = versionKey(roomKey, iso(10), 'keyframe')
		const kf = await encodeVersionBody(versions[0])
		await chainBucket.put(keyframeKey, kf.body, { customMetadata: kf.metadata })
		const put = async (at: number, firstSeq: number, prev: RoomSnapshot, next: RoomSnapshot) => {
			const deltas = [{ t: iso(at), delta: buildSnapshotDelta(prev, next) }]
			const encoded = await encodeVersionBody({ v: 1, deltas })
			await chainBucket.put(versionKey(roomKey, iso(at), 'segment'), encoded.body, {
				customMetadata: {
					...encoded.metadata,
					...segmentCustomMetadata({ keyframeKey, firstSeq, timestamps: [iso(at)] }),
				},
			})
		}
		// Sequence 1 at :20, then the clock steps back: sequence 2 lands under :15.
		await put(20, 1, versions[0], versions[1])
		await put(15, 2, versions[1], versions[2])

		expect(await verifyRoomVersions({ chainBucket, roomKey, limit: 20 })).toEqual({
			replayed: 3,
			// One listing, then a get for the keyframe and for each segment.
			reads: 4,
			complete: true,
			mismatches: [],
			errors: [],
		})
	})
})

describe('verifyRoomVersions read budget', () => {
	it('stops once the reads run out', async () => {
		const chainBucket = createFakeR2()
		for (let i = 0; i < 20; i++) {
			const iso = `2026-09-01T00:00:${String(i).padStart(2, '0')}.000Z`
			const kf = await encodeVersionBody(snapshot(i + 1, [`shape:${i}`]))
			await chainBucket.put(versionKey(roomKey, iso, 'keyframe'), kf.body, {
				customMetadata: kf.metadata,
			})
		}

		// One listing, then one read per keyframe: six keyframes fit, the seventh never starts.
		expect(await verifyRoomVersions({ chainBucket, roomKey, limit: 7 })).toEqual({
			replayed: 6,
			reads: 7,
			complete: false,
			mismatches: [],
			errors: [],
		})
	})
})

describe('verifyRoomVersions with a limit', () => {
	it('spends the budget on the newest chain first', async () => {
		const chainBucket = createFakeR2()
		// Two chains: an old one with a delta whose recorded hash is wrong, and a new one that is fine.
		const old = [snapshot(1, ['shape:old']), snapshot(2, ['shape:old', 'shape:b'])]
		const oldKeyframeKey = versionKey(roomKey, '2026-08-01T00:00:00.000Z', 'keyframe')
		const oldSegmentIso = '2026-08-01T00:00:01.000Z'
		const kfOld = await encodeVersionBody(old[0])
		await chainBucket.put(oldKeyframeKey, kfOld.body, { customMetadata: kfOld.metadata })
		const segment = await encodeVersionBody({
			v: 1,
			deltas: [{ t: oldSegmentIso, delta: buildSnapshotDelta(old[0], old[1]) }],
		})
		const oldSegmentKey = versionKey(roomKey, oldSegmentIso, 'segment')
		await chainBucket.put(oldSegmentKey, segment.body, {
			customMetadata: {
				...segment.metadata,
				...segmentCustomMetadata({
					keyframeKey: oldKeyframeKey,
					firstSeq: 1,
					timestamps: [oldSegmentIso],
				}),
			},
		})
		await tamperRecordedHash(chainBucket, oldSegmentKey, oldSegmentIso)
		const kfNew = await encodeVersionBody(snapshot(3, ['shape:new']))
		await chainBucket.put(versionKey(roomKey, '2026-09-01T00:00:00.000Z', 'keyframe'), kfNew.body, {
			customMetadata: kfNew.metadata,
		})

		// One listing plus the one read the newest keyframe costs, so the old chain never starts.
		const limited = await verifyRoomVersions({ chainBucket, roomKey, limit: 2 })
		const full = await verifyRoomVersions({ chainBucket, roomKey, limit: 20 })

		expect(limited).toEqual({
			replayed: 1,
			reads: 2,
			complete: false,
			mismatches: [],
			errors: [],
		})
		expect(full.mismatches).toEqual([oldSegmentIso])
	})

	it('marks a run the listing alone exhausted as incomplete', async () => {
		const chainBucket = createFakeR2()
		await seedChain(chainBucket, [snapshot(1, ['shape:a'])])

		// The listing spends the whole budget before the keyframe is read: nothing is verified, and
		// `complete: false` is the only thing separating this result from a clean room.
		expect(await verifyRoomVersions({ chainBucket, roomKey, limit: 1 })).toEqual({
			replayed: 0,
			reads: 1,
			complete: false,
			mismatches: [],
			errors: [],
		})
	})
})

describe('verifyRoomVersions on a segment the read path rejects', () => {
	const versions = [
		snapshot(1, ['shape:a']),
		snapshot(2, ['shape:a', 'shape:b']),
		snapshot(3, ['shape:a', 'shape:b', 'shape:c']),
	]

	async function seedAndFindSegment() {
		const chainBucket = createFakeR2()
		await seedChain(chainBucket, versions)
		const listing = await chainBucket.list({ prefix: `${roomKey}/` })
		const segment = listing.objects.find((o) => o.key.endsWith('.s'))!
		const object = (await chainBucket.get(segment.key))!
		return { chainBucket, segment, metadata: object.customMetadata! }
	}

	it('reports a body that does not begin with what its metadata lists', async () => {
		const { chainBucket, segment, metadata } = await seedAndFindSegment()
		// Same first delta, then a version the listing never promised in place of the second.
		const torn = await encodeVersionBody({
			v: 1,
			deltas: [
				{ t: '2026-09-01T00:00:01.000Z', delta: buildSnapshotDelta(versions[0], versions[1]) },
				{ t: '2026-09-01T00:00:09.000Z', delta: buildSnapshotDelta(versions[1], versions[2]) },
			],
		})
		await chainBucket.put(segment.key, torn.body, { customMetadata: metadata })

		const result = await verifyRoomVersions({ chainBucket, roomKey, limit: 20 })

		expect(result.errors.map((e) => e.message)).toEqual([
			expect.stringMatching(/does not match its metadata/),
		])
	})

	it('reports a segment written in an unknown format', async () => {
		const { chainBucket, segment, metadata } = await seedAndFindSegment()
		const future = await encodeVersionBody({ v: 2, deltas: [] })
		await chainBucket.put(segment.key, future.body, { customMetadata: metadata })

		const result = await verifyRoomVersions({ chainBucket, roomKey, limit: 20 })

		expect(result.errors.map((e) => e.message)).toEqual([
			expect.stringMatching(/unknown version segment format/),
		])
	})
})

describe('verifyRoomVersions on an orphaned segment', () => {
	it('reports a segment whose keyframe is not in the index', async () => {
		const chainBucket = createFakeR2()
		const versions = [snapshot(1, ['shape:a']), snapshot(2, ['shape:a', 'shape:b'])]
		await seedChain(chainBucket, versions)
		// A segment left behind by a chain whose keyframe object is gone.
		const orphanIso = '2026-08-01T00:00:01.000Z'
		const missingKeyframeKey = versionKey(roomKey, '2026-08-01T00:00:00.000Z', 'keyframe')
		const encoded = await encodeVersionBody({
			v: 1,
			deltas: [{ t: orphanIso, delta: buildSnapshotDelta(versions[0], versions[1]) }],
		})
		await chainBucket.put(versionKey(roomKey, orphanIso, 'segment'), encoded.body, {
			customMetadata: {
				...encoded.metadata,
				...segmentCustomMetadata({
					keyframeKey: missingKeyframeKey,
					firstSeq: 1,
					timestamps: [orphanIso],
				}),
			},
		})

		const result = await verifyRoomVersions({ chainBucket, roomKey, limit: 20 })

		expect(result.errors).toEqual([
			{
				timestamp: orphanIso,
				message: expect.stringMatching(/references missing keyframe/),
			},
		])
		// The intact chain still verifies clean around the orphan.
		expect(result.mismatches).toEqual([])
		expect(result.replayed).toBe(2)
	})

	it('reports the orphan even when the budget stops the walk', async () => {
		const chainBucket = createFakeR2()
		const orphanIso = '2026-08-01T00:00:01.000Z'
		const encoded = await encodeVersionBody({
			v: 1,
			deltas: [
				{
					t: orphanIso,
					delta: buildSnapshotDelta(snapshot(1, ['shape:a']), snapshot(2, ['shape:a', 'shape:b'])),
				},
			],
		})
		await chainBucket.put(versionKey(roomKey, orphanIso, 'segment'), encoded.body, {
			customMetadata: {
				...encoded.metadata,
				...segmentCustomMetadata({
					keyframeKey: versionKey(roomKey, '2026-08-01T00:00:00.000Z', 'keyframe'),
					firstSeq: 1,
					timestamps: [orphanIso],
				}),
			},
		})

		// The listing alone exhausts the budget; the orphan check costs no reads and still runs.
		const result = await verifyRoomVersions({ chainBucket, roomKey, limit: 1 })

		expect(result.errors.map((e) => e.message)).toEqual([
			expect.stringMatching(/references missing keyframe/),
		])
		expect(result.replayed).toBe(0)
	})
})

describe('verifyRoomVersions on an unreadable segment', () => {
	const iso = (s: number) => `2026-09-01T00:00:0${s}.000Z`
	const versions = [
		snapshot(1, ['shape:a']),
		snapshot(2, ['shape:a', 'shape:b']),
		snapshot(3, ['shape:a', 'shape:b', 'shape:c']),
	]

	/** A keyframe and two segments, where the one at `brokenSeq` has lost its chain reference. */
	async function seedWithBrokenSegment(chainBucket: R2Bucket, brokenSeq: 1 | 2) {
		const keyframeKey = versionKey(roomKey, iso(0), 'keyframe')
		const kf = await encodeVersionBody(versions[0])
		await chainBucket.put(keyframeKey, kf.body, { customMetadata: kf.metadata })

		for (const firstSeq of [1, 2] as const) {
			const encoded = await encodeVersionBody({
				v: 1,
				deltas: [
					{
						t: iso(firstSeq),
						delta: buildSnapshotDelta(versions[firstSeq - 1], versions[firstSeq]),
					},
				],
			})
			// The broken one keeps its body metadata and loses the chain reference, the way a
			// half-written custom metadata set would.
			await chainBucket.put(versionKey(roomKey, iso(firstSeq), 'segment'), encoded.body, {
				customMetadata:
					firstSeq === brokenSeq
						? encoded.metadata
						: {
								...encoded.metadata,
								...segmentCustomMetadata({
									keyframeKey,
									firstSeq,
									timestamps: [iso(firstSeq)],
								}),
							},
			})
		}
	}

	it('reports a trailing segment that leaves no sequence gap behind it', async () => {
		const chainBucket = createFakeR2()
		await seedWithBrokenSegment(chainBucket, 2)

		// Without the rejection report this is a clean room: the walk replays the keyframe and
		// sequence 1, then simply ends, and nothing is left to trip the sequence check.
		expect(await verifyRoomVersions({ chainBucket, roomKey, limit: 20 })).toEqual({
			replayed: 2,
			reads: 3,
			complete: true,
			mismatches: [],
			errors: [
				{
					timestamp: iso(2),
					message: expect.stringMatching(/has no readable chain reference/),
				},
			],
		})
	})

	it('reports a mid-chain segment directly, not only as the gap it leaves', async () => {
		const chainBucket = createFakeR2()
		await seedWithBrokenSegment(chainBucket, 1)

		const result = await verifyRoomVersions({ chainBucket, roomKey, limit: 20 })

		expect(result.errors).toEqual([
			{ timestamp: iso(1), message: expect.stringMatching(/has no readable chain reference/) },
			{ timestamp: iso(2), message: expect.stringMatching(/expected at sequence 1, found 2/) },
		])
		expect(result.mismatches).toEqual([])
	})

	it('reports the segment even when the budget stops the walk', async () => {
		const chainBucket = createFakeR2()
		const encoded = await encodeVersionBody({
			v: 1,
			deltas: [{ t: iso(1), delta: buildSnapshotDelta(versions[0], versions[1]) }],
		})
		await chainBucket.put(versionKey(roomKey, iso(1), 'segment'), encoded.body, {
			customMetadata: encoded.metadata,
		})

		// The listing alone exhausts the budget; reading the index is what found this, so it is
		// reported whether or not the walk gets to run.
		const result = await verifyRoomVersions({ chainBucket, roomKey, limit: 1 })

		expect(result.errors.map((e) => e.message)).toEqual([
			expect.stringMatching(/has no readable chain reference/),
		])
		expect(result.replayed).toBe(0)
	})
})

describe('verifyRoomVersions', () => {
	it('reports a clean chain as clean', async () => {
		const chainBucket = createFakeR2()
		await seedChain(chainBucket, [snapshot(1, ['shape:a']), snapshot(2, ['shape:a', 'shape:b'])])

		expect(await verifyRoomVersions({ chainBucket, roomKey, limit: 20 })).toEqual({
			replayed: 2,
			reads: 3,
			complete: true,
			mismatches: [],
			errors: [],
		})
	})

	it('names the timestamp whose replay disagrees with its recorded hash', async () => {
		const chainBucket = createFakeR2()
		await seedChain(chainBucket, [snapshot(1, ['shape:a']), snapshot(2, ['shape:a', 'shape:b'])])
		const timestamp = '2026-09-01T00:00:01.000Z'
		await tamperRecordedHash(chainBucket, versionKey(roomKey, timestamp, 'segment'), timestamp)

		const result = await verifyRoomVersions({ chainBucket, roomKey, limit: 20 })

		expect(result.mismatches).toEqual([timestamp])
	})
})

describe('verifyVersionChainRoute', () => {
	it('skips test rooms without touching R2', async () => {
		const list = vi.fn()
		const response = await verifyVersionChainRoute(
			{ params: { roomId: 'test_board' }, query: {} } as unknown as IRequest,
			{ ROOMS_HISTORY: { list } } as unknown as Environment,
			true
		)
		expect(response.status).toBe(404)
		expect(list).not.toHaveBeenCalled()
	})
})
