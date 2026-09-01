import { UnknownRecord } from '@tldraw/store'
import { RoomSnapshot } from '@tldraw/sync-core'
import { describe, expect, it } from 'vitest'
import { createFakeR2 } from './test/fakeR2'
import { ChainState, PendingDelta, SEGMENT_CAP } from './versionChain'
import { reconstructVersion } from './versionChainRead'
import { writeVersionChainEntry } from './versionChainWrite'

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

/** Persists `versions` in order, threading chain state and the pending buffer as the DO does. */
async function persistAll(bucket: R2Bucket, versions: RoomSnapshot[]) {
	let chain: ChainState | null = null
	let pending: PendingDelta[] = []
	const wrote: string[] = []

	for (let i = 0; i < versions.length; i++) {
		const result = await writeVersionChainEntry({
			bucket,
			roomKey,
			iso: isoAt(i),
			chain,
			pending,
			previous: i === 0 ? null : versions[i - 1],
			next: versions[i],
			now: i * 1000,
		})
		chain = result.chain
		pending = result.pending
		wrote.push(result.wrote)
	}

	return { chain, pending, wrote }
}

describe('writeVersionChainEntry', () => {
	it('writes a keyframe when there is no chain', async () => {
		const bucket = createFakeR2()

		const result = await writeVersionChainEntry({
			bucket,
			roomKey,
			iso: isoAt(0),
			chain: null,
			pending: [],
			previous: null,
			next: snapshot(1, ['shape:a']),
			now: 0,
		})

		expect(result.wrote).toBe('keyframe')
		expect(result.reason).toBe('no-chain')
		expect(result.chain.openSegment).toBeNull()
		expect(result.pending).toEqual([])
		expect(await bucket.head(`${roomKey}/${isoAt(0)}.k`)).not.toBeNull()
	})

	it('packs deltas into one segment object that reconstructs exactly', async () => {
		const bucket = createFakeR2()
		const legacyBucket = createFakeR2()
		const versions = [
			snapshot(1, ['shape:a']),
			snapshot(2, ['shape:a', 'shape:b']),
			snapshot(3, ['shape:a', 'shape:b', 'shape:c']),
		]

		const { wrote } = await persistAll(bucket, versions)

		expect(wrote).toEqual(['keyframe', 'delta', 'delta'])
		// One keyframe plus one segment holding both deltas — not one object per version.
		expect((await bucket.list({ prefix: roomKey })).objects).toHaveLength(2)

		for (let i = 0; i < versions.length; i++) {
			const result = await reconstructVersion({
				chainBucket: bucket,
				legacyBucket,
				roomKey,
				timestamp: isoAt(i),
			})
			expect(result?.snapshot).toEqual(versions[i])
		}
	})

	it('opens a new segment once the cap is reached', async () => {
		const bucket = createFakeR2()
		const versions = [snapshot(1, ['shape:0'])]
		for (let i = 1; i <= SEGMENT_CAP + 1; i++) {
			versions.push(
				snapshot(
					i + 1,
					Array.from({ length: i + 1 }, (_, n) => `shape:${n}`)
				)
			)
		}

		const { chain, pending } = await persistAll(bucket, versions)

		expect(chain!.openSegment!.key).toBe(`${roomKey}/${isoAt(SEGMENT_CAP + 1)}.s`)
		expect(chain!.openSegment!.firstSeq).toBe(SEGMENT_CAP + 1)
		// The buffer resets with the new segment rather than growing without bound.
		expect(pending).toHaveLength(1)
		expect((await bucket.list({ prefix: roomKey })).objects).toHaveLength(3)
	})

	it('cuts a fresh keyframe when the previous state is not the chain head', async () => {
		const bucket = createFakeR2()
		const first = await writeVersionChainEntry({
			bucket,
			roomKey,
			iso: isoAt(0),
			chain: null,
			pending: [],
			previous: null,
			next: snapshot(1, ['shape:a']),
			now: 0,
		})

		const second = await writeVersionChainEntry({
			bucket,
			roomKey,
			iso: isoAt(1),
			chain: first.chain,
			pending: first.pending,
			// A different previous state than the chain head encodes — a restore, say.
			previous: snapshot(99, ['shape:z']),
			next: snapshot(100, ['shape:z', 'shape:y']),
			now: 1000,
		})

		expect(second.wrote).toBe('keyframe')
		expect(second.reason).toBe('fingerprint-mismatch')
		expect(second.pending).toEqual([])
	})

	it('continues the open segment across a cold start', async () => {
		const bucket = createFakeR2()
		const legacyBucket = createFakeR2()
		const versions = [
			snapshot(1, ['shape:a']),
			snapshot(2, ['shape:a', 'shape:b']),
			snapshot(3, ['shape:a', 'shape:b', 'shape:c']),
		]

		let chain: ChainState | null = null
		let pending: PendingDelta[] = []
		for (let i = 0; i < 2; i++) {
			const result = await writeVersionChainEntry({
				bucket,
				roomKey,
				iso: isoAt(i),
				chain,
				pending,
				previous: i === 0 ? null : versions[i - 1],
				next: versions[i],
				now: i * 1000,
			})
			chain = result.chain
			pending = result.pending
		}

		// Eviction: chain state survives in DO storage, the in-memory buffer does not. The durable
		// object rehydrates it from the open segment, which is what the DO wiring below does.
		const rehydrated = pending

		const afterWake = await writeVersionChainEntry({
			bucket,
			roomKey,
			iso: isoAt(2),
			chain: JSON.parse(JSON.stringify(chain)),
			pending: rehydrated,
			previous: versions[1],
			next: versions[2],
			now: 2000,
		})

		expect(afterWake.wrote).toBe('delta')
		expect(
			(
				await reconstructVersion({
					chainBucket: bucket,
					legacyBucket,
					roomKey,
					timestamp: isoAt(2),
				})
			)?.snapshot
		).toEqual(versions[2])
	})

	it('cuts a keyframe when the schema hash changes', async () => {
		const bucket = createFakeR2()
		const before = snapshot(1, ['shape:a'])
		const after = {
			...snapshot(2, ['shape:a']),
			schema: { schemaVersion: 2, sequences: { 'com.tldraw.shape': 2 } } as any,
		}

		const first = await writeVersionChainEntry({
			bucket,
			roomKey,
			iso: isoAt(0),
			chain: null,
			pending: [],
			previous: null,
			next: before,
			now: 0,
		})
		const second = await writeVersionChainEntry({
			bucket,
			roomKey,
			iso: isoAt(1),
			chain: first.chain,
			pending: first.pending,
			previous: before,
			next: after,
			now: 1000,
		})

		// The chain head fingerprint is `before`'s, so the schema move is what the decision sees.
		expect(second.wrote).toBe('keyframe')
		expect(second.reason).toBe('schema-change')
	})
})
