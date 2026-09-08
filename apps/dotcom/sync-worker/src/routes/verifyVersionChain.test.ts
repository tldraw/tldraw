import { UnknownRecord } from '@tldraw/store'
import { RoomSnapshot } from '@tldraw/sync-core'
import { describe, expect, it } from 'vitest'
import { createFakeR2 } from '../test/fakeR2'
import { ChainState, PendingDelta, segmentCustomMetadata, versionKey } from '../versionChain'
import { encodeVersionBody } from '../versionChainCodec'
import { writeVersionChainEntry } from '../versionChainWrite'
import { buildSnapshotDelta } from '../versionDelta'
import { verifyRoomVersions } from './verifyVersionChain'

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

/** Mirrors what dual-write produces: a chain in one bucket, full copies in the other. */
async function seedDualWrite(
	chainBucket: R2Bucket,
	legacyBucket: R2Bucket,
	versions: RoomSnapshot[]
) {
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
		await legacyBucket.put(`${roomKey}/${iso}`, JSON.stringify(versions[i]))
	}
}

describe('verifyRoomVersions under clock skew', () => {
	it('verifies a chain whose later segment has an earlier key', async () => {
		const chainBucket = createFakeR2()
		const legacyBucket = createFakeR2()
		const versions = [
			snapshot(1, ['shape:a']),
			snapshot(2, ['shape:a', 'shape:b']),
			snapshot(3, ['shape:a', 'shape:b', 'shape:c']),
		]
		const iso = (s: number) => `2026-09-01T00:00:${String(s).padStart(2, '0')}.000Z`
		const keyframeKey = versionKey(roomKey, iso(10), 'keyframe')
		const kf = await encodeVersionBody(versions[0])
		await chainBucket.put(keyframeKey, kf.body, { customMetadata: kf.metadata })
		await legacyBucket.put(`${roomKey}/${iso(10)}`, JSON.stringify(versions[0]))
		const put = async (at: number, firstSeq: number, prev: RoomSnapshot, next: RoomSnapshot) => {
			const deltas = [{ t: iso(at), delta: buildSnapshotDelta(prev, next) }]
			const encoded = await encodeVersionBody({ v: 1, deltas })
			await chainBucket.put(versionKey(roomKey, iso(at), 'segment'), encoded.body, {
				customMetadata: {
					...encoded.metadata,
					...segmentCustomMetadata({ keyframeKey, firstSeq, timestamps: [iso(at)] }),
				},
			})
			await legacyBucket.put(`${roomKey}/${iso(at)}`, JSON.stringify(next))
		}
		// Sequence 1 at :20, then the clock steps back: sequence 2 lands under :15.
		await put(20, 1, versions[0], versions[1])
		await put(15, 2, versions[1], versions[2])

		expect(await verifyRoomVersions({ chainBucket, legacyBucket, roomKey, limit: 20 })).toEqual({
			checked: 3,
			replayed: 3,
			// One listing, then a get and a legacy get for the keyframe and for each segment.
			reads: 7,
			complete: true,
			mismatches: [],
			errors: [],
		})
	})
})

describe('verifyRoomVersions after cut-over', () => {
	it('stops on the read budget when no legacy copy answers', async () => {
		const chainBucket = createFakeR2()
		const legacyBucket = createFakeR2()
		// Chain only, as the bucket looks once dual-write is off: nothing increments a comparison
		// counter, so a budget keyed off one would walk all twenty chains.
		for (let i = 0; i < 20; i++) {
			const iso = `2026-09-01T00:00:${String(i).padStart(2, '0')}.000Z`
			const kf = await encodeVersionBody(snapshot(i + 1, [`shape:${i}`]))
			await chainBucket.put(versionKey(roomKey, iso, 'keyframe'), kf.body, {
				customMetadata: kf.metadata,
			})
		}

		// One listing, then two reads per keyframe: three keyframes fit, the fourth never starts.
		expect(await verifyRoomVersions({ chainBucket, legacyBucket, roomKey, limit: 7 })).toEqual({
			checked: 0,
			replayed: 3,
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
		const legacyBucket = createFakeR2()
		// Two chains: an old one whose legacy copy is wrong, and a new one that is fine.
		const old = snapshot(1, ['shape:old'])
		const recent = snapshot(2, ['shape:new'])
		for (const [iso, version, legacy] of [
			['2026-08-01T00:00:00.000Z', old, snapshot(9, ['shape:tampered'])],
			['2026-09-01T00:00:00.000Z', recent, recent],
		] as const) {
			const kf = await encodeVersionBody(version)
			await chainBucket.put(versionKey(roomKey, iso, 'keyframe'), kf.body, {
				customMetadata: kf.metadata,
			})
			await legacyBucket.put(`${roomKey}/${iso}`, JSON.stringify(legacy))
		}

		// One listing plus the two reads the first keyframe costs, so the second never starts.
		const limited = await verifyRoomVersions({ chainBucket, legacyBucket, roomKey, limit: 3 })
		const full = await verifyRoomVersions({ chainBucket, legacyBucket, roomKey, limit: 20 })

		// With budget for one version, the newest chain is the one that gets checked.
		expect(limited).toEqual({
			checked: 1,
			replayed: 1,
			reads: 3,
			complete: false,
			mismatches: [],
			errors: [],
		})
		expect(full.mismatches).toEqual(['2026-08-01T00:00:00.000Z'])
	})

	it('marks a run the listing alone exhausted as incomplete', async () => {
		const chainBucket = createFakeR2()
		const legacyBucket = createFakeR2()
		await seedDualWrite(chainBucket, legacyBucket, [snapshot(1, ['shape:a'])])

		// The listing spends the whole budget before the keyframe is read: nothing is verified, and
		// `complete: false` is the only thing separating this result from a clean room.
		expect(await verifyRoomVersions({ chainBucket, legacyBucket, roomKey, limit: 1 })).toEqual({
			checked: 0,
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
		const legacyBucket = createFakeR2()
		await seedDualWrite(chainBucket, legacyBucket, versions)
		const listing = await chainBucket.list({ prefix: `${roomKey}/` })
		const segment = listing.objects.find((o) => o.key.endsWith('.s'))!
		const object = (await chainBucket.get(segment.key))!
		return { chainBucket, legacyBucket, segment, metadata: object.customMetadata! }
	}

	it('reports a body that does not begin with what its metadata lists', async () => {
		const { chainBucket, legacyBucket, segment, metadata } = await seedAndFindSegment()
		// Same first delta, then a version the listing never promised in place of the second.
		const torn = await encodeVersionBody({
			v: 1,
			deltas: [
				{ t: '2026-09-01T00:00:01.000Z', delta: buildSnapshotDelta(versions[0], versions[1]) },
				{ t: '2026-09-01T00:00:09.000Z', delta: buildSnapshotDelta(versions[1], versions[2]) },
			],
		})
		await chainBucket.put(segment.key, torn.body, { customMetadata: metadata })

		const result = await verifyRoomVersions({ chainBucket, legacyBucket, roomKey, limit: 20 })

		expect(result.errors.map((e) => e.message)).toEqual([
			expect.stringMatching(/does not match its metadata/),
		])
	})

	it('reports a segment written in an unknown format', async () => {
		const { chainBucket, legacyBucket, segment, metadata } = await seedAndFindSegment()
		const future = await encodeVersionBody({ v: 2, deltas: [] })
		await chainBucket.put(segment.key, future.body, { customMetadata: metadata })

		const result = await verifyRoomVersions({ chainBucket, legacyBucket, roomKey, limit: 20 })

		expect(result.errors.map((e) => e.message)).toEqual([
			expect.stringMatching(/unknown version segment format/),
		])
	})
})

describe('verifyRoomVersions on an orphaned segment', () => {
	it('reports a segment whose keyframe is not in the index', async () => {
		const chainBucket = createFakeR2()
		const legacyBucket = createFakeR2()
		const versions = [snapshot(1, ['shape:a']), snapshot(2, ['shape:a', 'shape:b'])]
		await seedDualWrite(chainBucket, legacyBucket, versions)
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

		const result = await verifyRoomVersions({ chainBucket, legacyBucket, roomKey, limit: 20 })

		expect(result.errors).toEqual([
			{
				timestamp: orphanIso,
				message: expect.stringMatching(/references missing keyframe/),
			},
		])
		// The intact chain still verifies clean around the orphan.
		expect(result.mismatches).toEqual([])
		expect(result.checked).toBe(2)
	})

	it('reports the orphan even when the budget stops the walk', async () => {
		const chainBucket = createFakeR2()
		const legacyBucket = createFakeR2()
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
		const result = await verifyRoomVersions({ chainBucket, legacyBucket, roomKey, limit: 1 })

		expect(result.errors.map((e) => e.message)).toEqual([
			expect.stringMatching(/references missing keyframe/),
		])
		expect(result.replayed).toBe(0)
	})
})

describe('verifyRoomVersions', () => {
	it('reports no mismatches when reconstruction matches the full copies', async () => {
		const chainBucket = createFakeR2()
		const legacyBucket = createFakeR2()
		await seedDualWrite(chainBucket, legacyBucket, [
			snapshot(1, ['shape:a']),
			snapshot(2, ['shape:a', 'shape:b']),
		])

		expect(await verifyRoomVersions({ chainBucket, legacyBucket, roomKey, limit: 20 })).toEqual({
			checked: 2,
			replayed: 2,
			reads: 5,
			complete: true,
			mismatches: [],
			errors: [],
		})
	})

	it('keeps replaying the chain when a legacy read fails', async () => {
		const chainBucket = createFakeR2()
		const legacyBucket = createFakeR2()
		await seedDualWrite(chainBucket, legacyBucket, [
			snapshot(1, ['shape:a']),
			snapshot(2, ['shape:a', 'shape:b']),
		])
		const flakyIso = '2026-09-01T00:00:00.000Z'
		const flakyLegacy = {
			...legacyBucket,
			get: async (key: string) => {
				if (key === `${roomKey}/${flakyIso}`) throw new Error('network connection lost')
				return legacyBucket.get(key)
			},
		} as unknown as R2Bucket

		// The failed read is an error naming the legacy side, not a broken chain: the replay
		// carries on and the next version still gets compared.
		expect(
			await verifyRoomVersions({ chainBucket, legacyBucket: flakyLegacy, roomKey, limit: 20 })
		).toEqual({
			checked: 1,
			replayed: 2,
			reads: 5,
			complete: true,
			mismatches: [],
			errors: [
				{
					timestamp: flakyIso,
					message: expect.stringMatching(/^legacy copy read failed: network connection lost/),
				},
			],
		})
	})

	it('names the timestamp when a reconstruction disagrees', async () => {
		const chainBucket = createFakeR2()
		const legacyBucket = createFakeR2()
		await seedDualWrite(chainBucket, legacyBucket, [
			snapshot(1, ['shape:a']),
			snapshot(2, ['shape:a', 'shape:b']),
		])
		await legacyBucket.put(
			`${roomKey}/2026-09-01T00:00:01.000Z`,
			JSON.stringify(snapshot(2, ['shape:wrong']))
		)

		const result = await verifyRoomVersions({ chainBucket, legacyBucket, roomKey, limit: 20 })

		expect(result.mismatches).toEqual(['2026-09-01T00:00:01.000Z'])
	})
})
