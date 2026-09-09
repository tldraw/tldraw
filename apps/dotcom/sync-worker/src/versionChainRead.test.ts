import { UnknownRecord } from '@tldraw/store'
import { RoomSnapshot } from '@tldraw/sync-core'
import { describe, expect, it } from 'vitest'
import { SEGMENT_CAP } from './config'
import { createFakeR2 } from './test/fakeR2'
import { segmentCustomMetadata, versionKey } from './versionChain'
import { decodeVersionBody, encodeVersionBody } from './versionChainCodec'
import {
	deleteAllVersions,
	listVersionTimestamps,
	loadChainIndex,
	openWholeVersionStream,
	reconstructVersion,
} from './versionChainRead'
import { buildSnapshotDelta } from './versionDelta'

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

function isoAt(i: number) {
	return `2026-09-01T00:00:${String(i).padStart(2, '0')}.000Z`
}

/** Writes a keyframe followed by `versions.length - 1` deltas packed `cap` to a segment. */
async function seedChain(bucket: R2Bucket, versions: RoomSnapshot[], cap = SEGMENT_CAP) {
	const keyframeKey = versionKey(roomKey, isoAt(0), 'keyframe')
	const encodedKeyframe = await encodeVersionBody(versions[0])
	await bucket.put(keyframeKey, encodedKeyframe.body, {
		customMetadata: encodedKeyframe.metadata,
	})

	const timestamps = [isoAt(0)]
	let pending: Array<{ t: string; delta: any }> = []
	let segmentKey: string | null = null
	let firstSeq = 1

	for (let i = 1; i < versions.length; i++) {
		const t = isoAt(i)
		timestamps.push(t)
		if (pending.length >= cap) {
			pending = []
			segmentKey = null
			firstSeq = i
		}
		if (!segmentKey) segmentKey = versionKey(roomKey, t, 'segment')
		pending.push({ t, delta: buildSnapshotDelta(versions[i - 1], versions[i]) })

		const encoded = await encodeVersionBody({ v: 1, deltas: pending })
		await bucket.put(segmentKey, encoded.body, {
			customMetadata: {
				...encoded.metadata,
				...segmentCustomMetadata({
					keyframeKey,
					firstSeq,
					timestamps: pending.map((d) => d.t),
				}),
			},
		})
	}

	return timestamps
}

describe('decodeVersionBody', () => {
	it('reads an uncompressed legacy object and a gzipped chain object alike', async () => {
		const bucket = createFakeR2()
		const encoded = await encodeVersionBody({ hello: 'world' })

		await bucket.put('plain', JSON.stringify({ hello: 'world' }))
		await bucket.put('gzipped', encoded.body, { customMetadata: encoded.metadata })

		expect(await decodeVersionBody((await bucket.get('plain'))!)).toEqual({ hello: 'world' })
		expect(await decodeVersionBody((await bucket.get('gzipped'))!)).toEqual({ hello: 'world' })
	})
})

describe('reconstructVersion', () => {
	it('returns a keyframe directly', async () => {
		const chainBucket = createFakeR2()
		const legacyBucket = createFakeR2()
		const versions = [snapshot(1, ['shape:a'])]
		await seedChain(chainBucket, versions)

		const result = await reconstructVersion({
			chainBucket,
			legacyBucket,
			roomKey,
			timestamp: isoAt(0),
		})

		expect(result?.snapshot).toEqual(versions[0])
		expect(result?.deltaCount).toBe(0)
		expect(result?.source).toBe('chain')
	})

	it('replays every version in a single segment', async () => {
		const chainBucket = createFakeR2()
		const legacyBucket = createFakeR2()
		const versions = [
			snapshot(1, ['shape:a']),
			snapshot(2, ['shape:a', 'shape:b']),
			snapshot(3, ['shape:b']),
		]
		const timestamps = await seedChain(chainBucket, versions)

		for (let i = 0; i < versions.length; i++) {
			const result = await reconstructVersion({
				chainBucket,
				legacyBucket,
				roomKey,
				timestamp: timestamps[i],
			})
			expect(result?.snapshot).toEqual(versions[i])
			expect(result?.deltaCount).toBe(i)
		}
	})

	it('replays across several segments', async () => {
		const chainBucket = createFakeR2()
		const legacyBucket = createFakeR2()
		const versions = [snapshot(1, ['shape:0'])]
		for (let i = 1; i <= 10; i++) {
			versions.push(
				snapshot(
					i + 1,
					Array.from({ length: i + 1 }, (_, n) => `shape:${n}`)
				)
			)
		}
		const timestamps = await seedChain(chainBucket, versions, 3)

		const last = await reconstructVersion({
			chainBucket,
			legacyBucket,
			roomKey,
			timestamp: timestamps[timestamps.length - 1],
		})

		expect(last?.snapshot).toEqual(versions[versions.length - 1])
		expect(last?.deltaCount).toBe(10)
		// One listing, one keyframe, four segments — not one GET per version.
		expect(last?.ops).toBe(6)
	})

	it('runs every R2 read through the scheduler, one operation each', async () => {
		const chainBucket = createFakeR2()
		const legacyBucket = createFakeR2()
		const versions = [snapshot(1, ['shape:0'])]
		for (let i = 1; i <= 10; i++) {
			versions.push(
				snapshot(
					i + 1,
					Array.from({ length: i + 1 }, (_, n) => `shape:${n}`)
				)
			)
		}
		const timestamps = await seedChain(chainBucket, versions, 3)

		// A bucket call outside a scheduled read is a connection the caller's budget never saw.
		let scheduledDepth = 0
		let unscheduledCalls = 0
		for (const method of ['get', 'list'] as const) {
			const original = (chainBucket[method] as any).bind(chainBucket)
			;(chainBucket as any)[method] = (...args: unknown[]) => {
				if (scheduledDepth === 0) unscheduledCalls++
				return original(...args)
			}
		}
		let scheduled = 0
		const schedule = async <T>(read: () => Promise<T>) => {
			scheduled++
			scheduledDepth++
			try {
				return await read()
			} finally {
				scheduledDepth--
			}
		}

		const last = await reconstructVersion({
			chainBucket,
			legacyBucket,
			roomKey,
			timestamp: timestamps[timestamps.length - 1],
			schedule,
		})

		expect(last?.snapshot).toEqual(versions[versions.length - 1])
		// One listing, one keyframe and four segments, each its own scheduled operation.
		expect(scheduled).toBe(6)
		expect(unscheduledCalls).toBe(0)
	})

	it('reads a version in the middle of an open segment', async () => {
		const chainBucket = createFakeR2()
		const legacyBucket = createFakeR2()
		const versions = [
			snapshot(1, ['shape:a']),
			snapshot(2, ['shape:a', 'shape:b']),
			snapshot(3, ['shape:a', 'shape:b', 'shape:c']),
		]
		const timestamps = await seedChain(chainBucket, versions)

		const middle = await reconstructVersion({
			chainBucket,
			legacyBucket,
			roomKey,
			timestamp: timestamps[1],
		})

		expect(middle?.snapshot).toEqual(versions[1])
	})

	it('falls back to a legacy full copy when the chain has nothing', async () => {
		const chainBucket = createFakeR2()
		const legacyBucket = createFakeR2()
		const legacy = snapshot(7, ['shape:legacy'])
		await legacyBucket.put(`${roomKey}/2026-08-01T00:00:00.000Z`, JSON.stringify(legacy))

		const result = await reconstructVersion({
			chainBucket,
			legacyBucket,
			roomKey,
			timestamp: '2026-08-01T00:00:00.000Z',
		})

		expect(result?.snapshot).toEqual(legacy)
		expect(result?.source).toBe('legacy')
	})

	it('returns null when neither bucket has the version', async () => {
		expect(
			await reconstructVersion({
				chainBucket: createFakeR2(),
				legacyBucket: createFakeR2(),
				roomKey,
				timestamp: '2026-08-01T00:00:00.000Z',
			})
		).toBeNull()
	})

	it('throws when the keyframe is missing', async () => {
		const chainBucket = createFakeR2()
		const versions = [snapshot(1, ['shape:a']), snapshot(2, ['shape:a', 'shape:b'])]
		const timestamps = await seedChain(chainBucket, versions)
		await chainBucket.delete(versionKey(roomKey, isoAt(0), 'keyframe'))

		await expect(
			reconstructVersion({
				chainBucket,
				legacyBucket: createFakeR2(),
				roomKey,
				timestamp: timestamps[1],
			})
		).rejects.toThrow(/keyframe/)
	})

	it('throws when a segment is missing from the middle of the chain', async () => {
		const chainBucket = createFakeR2()
		const versions = [snapshot(1, ['shape:0'])]
		for (let i = 1; i <= 6; i++) {
			versions.push(
				snapshot(
					i + 1,
					Array.from({ length: i + 1 }, (_, n) => `shape:${n}`)
				)
			)
		}
		const timestamps = await seedChain(chainBucket, versions, 2)
		// The segment opened at version 3 holds sequences 3-4; dropping it leaves a hole.
		await chainBucket.delete(versionKey(roomKey, isoAt(3), 'segment'))

		await expect(
			reconstructVersion({
				chainBucket,
				legacyBucket: createFakeR2(),
				roomKey,
				timestamp: timestamps[timestamps.length - 1],
			})
		).rejects.toThrow(/sequence/)
	})

	it('throws when a segment body disagrees with its metadata', async () => {
		const chainBucket = createFakeR2()
		const versions = [snapshot(1, ['shape:a']), snapshot(2, ['shape:a', 'shape:b'])]
		const timestamps = await seedChain(chainBucket, versions)
		const key = versionKey(roomKey, isoAt(1), 'segment')
		const encoded = await encodeVersionBody({ v: 1, deltas: [] })
		await chainBucket.put(key, encoded.body, {
			customMetadata: {
				...encoded.metadata,
				...segmentCustomMetadata({
					keyframeKey: versionKey(roomKey, isoAt(0), 'keyframe'),
					firstSeq: 1,
					timestamps: [isoAt(1)],
				}),
			},
		})

		await expect(
			reconstructVersion({
				chainBucket,
				legacyBucket: createFakeR2(),
				roomKey,
				timestamp: timestamps[1],
			})
		).rejects.toThrow(/does not match/)
	})

	it('throws when a tampered delta reconstructs to the wrong content', async () => {
		const chainBucket = createFakeR2()
		const versions = [snapshot(1, ['shape:a']), snapshot(2, ['shape:a', 'shape:b'])]
		const timestamps = await seedChain(chainBucket, versions)
		const key = versionKey(roomKey, isoAt(1), 'segment')
		const object = (await chainBucket.get(key))!
		const body = JSON.parse(
			await new Response(
				new Blob([await object.arrayBuffer()]).stream().pipeThrough(new DecompressionStream('gzip'))
			).text()
		)
		// Corrupt the op so the apply silently diverges from the recorded hash.
		body.deltas[0].delta.diff['shape:b'][1].x = 999
		const encoded = await encodeVersionBody(body)
		await chainBucket.put(key, encoded.body, {
			customMetadata: { ...object.customMetadata, ...encoded.metadata },
		})

		await expect(
			reconstructVersion({
				chainBucket,
				legacyBucket: createFakeR2(),
				roomKey,
				timestamp: timestamps[1],
			})
		).rejects.toThrow(/envelope hash/)
	})

	it('tolerates a segment body with more deltas than its listed metadata', async () => {
		const chainBucket = createFakeR2()
		const versions = [
			snapshot(1, ['shape:a']),
			snapshot(2, ['shape:a', 'shape:b']),
			snapshot(3, ['shape:a', 'shape:b', 'shape:c']),
		]
		await seedChain(chainBucket, versions)
		// Rewind the metadata to what a listing taken mid-append would have seen: the body holds
		// two deltas, the listing only knew about the first.
		const key = versionKey(roomKey, isoAt(1), 'segment')
		const object = (await chainBucket.get(key))!
		await chainBucket.put(key, await object.arrayBuffer(), {
			customMetadata: {
				...object.customMetadata,
				...segmentCustomMetadata({
					keyframeKey: versionKey(roomKey, isoAt(0), 'keyframe'),
					firstSeq: 1,
					timestamps: [isoAt(1)],
				}),
			},
		})

		const result = await reconstructVersion({
			chainBucket,
			legacyBucket: createFakeR2(),
			roomKey,
			timestamp: isoAt(1),
		})

		expect(result?.snapshot).toEqual(versions[1])
	})
})

describe('reconstructVersion segment format', () => {
	it('refuses a segment written in an unknown format', async () => {
		const chainBucket = createFakeR2()
		const legacyBucket = createFakeR2()
		const versions = [snapshot(1, ['shape:a']), snapshot(2, ['shape:a', 'shape:b'])]
		await seedChain(chainBucket, versions)

		const segmentKey = versionKey(roomKey, isoAt(1), 'segment')
		const existing = (await chainBucket.get(segmentKey))!
		const body = (await decodeVersionBody(existing)) as any
		const reencoded = await encodeVersionBody({ ...body, v: 2 })
		await chainBucket.put(segmentKey, reencoded.body, {
			customMetadata: { ...existing.customMetadata, ...reencoded.metadata },
		})

		await expect(
			reconstructVersion({ chainBucket, legacyBucket, roomKey, timestamp: isoAt(1) })
		).rejects.toThrow(/unknown version segment format/)
	})
})

describe('reconstructVersion under clock skew', () => {
	it('orders segments by sequence when a later segment has an earlier key', async () => {
		const chainBucket = createFakeR2()
		const versions = [
			snapshot(1, ['shape:a']),
			snapshot(2, ['shape:a', 'shape:b']),
			snapshot(3, ['shape:a', 'shape:b', 'shape:c']),
			snapshot(4, ['shape:b', 'shape:c']),
		]
		const keyframeKey = versionKey(roomKey, isoAt(10), 'keyframe')
		const kf = await encodeVersionBody(versions[0])
		await chainBucket.put(keyframeKey, kf.body, { customMetadata: kf.metadata })
		// Segment 1 opened at :20, holds seq 1-2. The DO then moved to a host whose clock is
		// behind: segment 2 opened at :15, holds seq 3.
		const put = async (key: string, firstSeq: number, deltas: Array<{ t: string; delta: any }>) => {
			const encoded = await encodeVersionBody({ v: 1, deltas })
			await chainBucket.put(key, encoded.body, {
				customMetadata: {
					...encoded.metadata,
					...segmentCustomMetadata({ keyframeKey, firstSeq, timestamps: deltas.map((d) => d.t) }),
				},
			})
		}
		await put(versionKey(roomKey, isoAt(20), 'segment'), 1, [
			{ t: isoAt(20), delta: buildSnapshotDelta(versions[0], versions[1]) },
			{ t: isoAt(21), delta: buildSnapshotDelta(versions[1], versions[2]) },
		])
		await put(versionKey(roomKey, isoAt(15), 'segment'), 3, [
			{ t: isoAt(15), delta: buildSnapshotDelta(versions[2], versions[3]) },
		])

		const late = await reconstructVersion({
			chainBucket,
			legacyBucket: createFakeR2(),
			roomKey,
			timestamp: isoAt(15),
		})
		const early = await reconstructVersion({
			chainBucket,
			legacyBucket: createFakeR2(),
			roomKey,
			timestamp: isoAt(21),
		})

		expect(late?.snapshot).toEqual(versions[3])
		expect(early?.snapshot).toEqual(versions[2])
	})
})

describe('openWholeVersionStream', () => {
	async function text(stream: ReadableStream<Uint8Array>) {
		return await new Response(stream).text()
	}

	it('streams a keyframe decompressed, a legacy copy raw, and nothing for a delta', async () => {
		const chainBucket = createFakeR2()
		const legacyBucket = createFakeR2()
		const versions = [snapshot(1, ['shape:a']), snapshot(2, ['shape:a', 'shape:b'])]
		const timestamps = await seedChain(chainBucket, versions)
		const legacy = snapshot(9, ['shape:legacy'])
		await legacyBucket.put(`${roomKey}/2026-08-01T00:00:00.000Z`, JSON.stringify(legacy))
		const { entries: index } = await loadChainIndex(chainBucket, roomKey)

		const keyframe = await openWholeVersionStream({
			chainBucket,
			legacyBucket,
			roomKey,
			timestamp: timestamps[0],
			index,
		})
		const legacyStream = await openWholeVersionStream({
			chainBucket,
			legacyBucket,
			roomKey,
			timestamp: '2026-08-01T00:00:00.000Z',
			index,
		})
		const delta = await openWholeVersionStream({
			chainBucket,
			legacyBucket,
			roomKey,
			timestamp: timestamps[1],
			index,
		})

		expect(JSON.parse(await text(keyframe!))).toEqual(versions[0])
		expect(JSON.parse(await text(legacyStream!))).toEqual(legacy)
		expect(delta).toBeNull()
	})
})

describe('listVersionTimestamps with a limit', () => {
	it('caps the result and reuses a preloaded index', async () => {
		const chainBucket = createFakeR2()
		const legacyBucket = createFakeR2()
		await seedChain(chainBucket, [snapshot(1, ['shape:a']), snapshot(2, ['shape:a', 'shape:b'])])
		for (let i = 0; i < 5; i++) {
			await legacyBucket.put(`${roomKey}/2026-08-0${i + 1}T00:00:00.000Z`, '{}')
		}
		const { entries: index } = await loadChainIndex(chainBucket, roomKey)

		const capped = await listVersionTimestamps({
			chainBucket,
			legacyBucket,
			roomKey,
			prefix: '',
			index,
			limit: 1,
		})

		expect(capped).toEqual([isoAt(1)])
	})
})

describe('deleteAllVersions', () => {
	it('sweeps a long history in batched deletes, not one subrequest per key', async () => {
		const legacyBucket = createFakeR2()
		for (let i = 0; i < 1100; i++) {
			await legacyBucket.put(`${roomKey}/2026-08-01T${String(i).padStart(6, '0')}Z`, '{}')
		}
		let deleteCalls = 0
		const counting = new Proxy(legacyBucket, {
			get(target, prop) {
				if (prop === 'delete') {
					return async (keys: string | string[]) => {
						deleteCalls++
						expect(Array.isArray(keys) ? keys.length : 1).toBeLessThanOrEqual(1000)
						return (target as any).delete(keys)
					}
				}
				return (target as any)[prop as keyof R2Bucket]
			},
		}) as R2Bucket

		await deleteAllVersions({ chainBucket: createFakeR2(), legacyBucket: counting, roomKey })

		expect((await legacyBucket.list({ prefix: `${roomKey}/` })).objects).toHaveLength(0)
		expect(deleteCalls).toBe(2)
	})
})

describe('listVersionTimestamps', () => {
	it('merges chain and legacy versions, dedupes and sorts newest first', async () => {
		const chainBucket = createFakeR2()
		const legacyBucket = createFakeR2()
		await seedChain(chainBucket, [snapshot(1, ['shape:a']), snapshot(2, ['shape:a', 'shape:b'])])
		await legacyBucket.put(`${roomKey}/2026-08-31T00:00:00.000Z`, '{}')

		expect(
			await listVersionTimestamps({ chainBucket, legacyBucket, roomKey, prefix: '2026-0' })
		).toEqual([isoAt(1), isoAt(0), '2026-08-31T00:00:00.000Z'])
	})
})
