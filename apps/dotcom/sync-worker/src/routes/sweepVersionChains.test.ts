import { UnknownRecord } from '@tldraw/store'
import { RoomSnapshot } from '@tldraw/sync-core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeR2 } from '../test/fakeR2'
import { Environment } from '../types'
import { ChainState, PendingDelta } from '../versionChain'
import { writeVersionChainEntry } from '../versionChainWrite'
import { sweepVersionChains } from './sweepVersionChains'

const files = vi.hoisted(() => ({ rows: [] as Array<{ id: string; updatedAt: number }> }))
const destroy = vi.hoisted(() => vi.fn())
// Lets one test spend the whole read budget on a single room. Reaching 800 reads for real would
// mean seeding ~800 versions; everything else runs the real verifier.
const verifier = vi.hoisted(() => ({ stub: null as null | (() => Promise<any>) }))

vi.mock('./verifyVersionChain', async (importOriginal) => {
	const actual = await importOriginal<typeof import('./verifyVersionChain')>()
	return {
		...actual,
		verifyRoomVersions: async (args: any) =>
			verifier.stub ? verifier.stub() : actual.verifyRoomVersions(args),
	}
})

// The sweep's only Postgres use is one keyset page of the file table, so the pool is faked down to
// the builder methods that page uses.
vi.mock('../postgres', () => ({
	createPostgresConnectionPool: () => {
		const builder: any = {
			select: () => builder,
			where: () => builder,
			orderBy: () => builder,
			limit: (n: number) => {
				builder._limit = n
				return builder
			},
			execute: async () => files.rows.slice(0, builder._limit ?? files.rows.length),
		}
		return { selectFrom: () => builder, destroy }
	},
}))

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

async function seedChain(
	chainBucket: R2Bucket,
	legacyBucket: R2Bucket,
	roomKey: string,
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

function env(chainBucket: R2Bucket, legacyBucket: R2Bucket): Environment {
	return {
		ROOMS_HISTORY: chainBucket,
		ROOMS_HISTORY_EPHEMERAL: legacyBucket,
		MEASURE: undefined,
	} as unknown as Environment
}

const versions = [snapshot(1, ['shape:a']), snapshot(2, ['shape:a', 'shape:b'])]

describe('sweepVersionChains', () => {
	beforeEach(() => {
		files.rows = []
		destroy.mockClear()
		verifier.stub = null
	})

	it('reports a healthy room as verified with no failures', async () => {
		const chainBucket = createFakeR2()
		const legacyBucket = createFakeR2()
		await seedChain(chainBucket, legacyBucket, 'app_rooms/file1', versions)
		files.rows = [{ id: 'file1', updatedAt: 100 }]

		const result = await sweepVersionChains({
			env: env(chainBucket, legacyBucket),
			rooms: 10,
			readsPerRoom: 50,
		})

		expect(result.swept).toBe(1)
		expect(result.verified).toBe(1)
		expect(result.failed).toBe(0)
		expect(result.failures).toEqual([])
		// A short page means the table ended, so there is nothing to resume from.
		expect(result.nextCursor).toBeNull()
	})

	it('counts a room with no chain as swept but not verified', async () => {
		const chainBucket = createFakeR2()
		const legacyBucket = createFakeR2()
		files.rows = [{ id: 'file1', updatedAt: 100 }]

		const result = await sweepVersionChains({
			env: env(chainBucket, legacyBucket),
			rooms: 10,
			readsPerRoom: 50,
		})

		// The distinction that stops a partial rollout's empty rooms reading as a clean fleet.
		expect(result.swept).toBe(1)
		expect(result.verified).toBe(0)
		expect(result.failed).toBe(0)
	})

	it('reports a room whose chain disagrees with its legacy copy', async () => {
		const chainBucket = createFakeR2()
		const legacyBucket = createFakeR2()
		await seedChain(chainBucket, legacyBucket, 'app_rooms/file1', versions)
		// Rewrite one full copy so the chain replay and the legacy record disagree.
		await legacyBucket.put(
			'app_rooms/file1/2026-09-01T00:00:01.000Z',
			JSON.stringify(snapshot(2, ['shape:a', 'shape:z']))
		)
		files.rows = [{ id: 'file1', updatedAt: 100 }]

		const result = await sweepVersionChains({
			env: env(chainBucket, legacyBucket),
			rooms: 10,
			readsPerRoom: 50,
		})

		expect(result.failed).toBe(1)
		expect(result.failures).toEqual([
			{ fileId: 'file1', reason: 'mismatch', detail: 'mismatch at 2026-09-01T00:00:01.000Z' },
		])
	})

	it('skips test files without reading R2 and still advances the cursor past them', async () => {
		const legacyBucket = createFakeR2()
		const list = vi.fn()
		files.rows = [{ id: 'test_file1', updatedAt: 100 }]

		const result = await sweepVersionChains({
			env: env({ list } as unknown as R2Bucket, legacyBucket),
			rooms: 1,
			readsPerRoom: 50,
		})

		expect(list).not.toHaveBeenCalled()
		expect(result.swept).toBe(0)
		// A full page of test files must not park the walk on the same offset forever.
		expect(result.nextCursor).toBe('100_test_file1')
	})

	it('returns a cursor when the page is full and resumes from it', async () => {
		const chainBucket = createFakeR2()
		const legacyBucket = createFakeR2()
		await seedChain(chainBucket, legacyBucket, 'app_rooms/file1', versions)
		files.rows = [
			{ id: 'file1', updatedAt: 200 },
			{ id: 'file2', updatedAt: 100 },
		]

		const first = await sweepVersionChains({
			env: env(chainBucket, legacyBucket),
			rooms: 1,
			readsPerRoom: 50,
		})

		expect(first.swept).toBe(1)
		expect(first.nextCursor).toBe('200_file1')
	})

	it('resumes at the room the read budget stopped on rather than past it', async () => {
		const chainBucket = createFakeR2()
		const legacyBucket = createFakeR2()
		files.rows = [
			{ id: 'file1', updatedAt: 300 },
			{ id: 'file2', updatedAt: 200 },
			{ id: 'file3', updatedAt: 100 },
		]
		verifier.stub = async () => ({
			checked: 1,
			replayed: 1,
			reads: 900,
			complete: true,
			mismatches: [],
			errors: [],
		})

		const result = await sweepVersionChains({
			env: env(chainBucket, legacyBucket),
			rooms: 3,
			readsPerRoom: 50,
		})

		expect(result.swept).toBe(1)
		// file2 was never looked at, and continuation excludes the cursor: pointing it at file2 would
		// drop that room from the sweep for good.
		expect(result.nextCursor).toBe('300_file1')
	})

	it('keeps the cursor when the budget stops the walk on the last page', async () => {
		const chainBucket = createFakeR2()
		const legacyBucket = createFakeR2()
		files.rows = [
			{ id: 'file1', updatedAt: 300 },
			{ id: 'file2', updatedAt: 200 },
		]
		verifier.stub = async () => ({
			checked: 1,
			replayed: 1,
			reads: 900,
			complete: true,
			mismatches: [],
			errors: [],
		})

		const result = await sweepVersionChains({
			env: env(chainBucket, legacyBucket),
			rooms: 10,
			readsPerRoom: 50,
		})

		// A short page usually means the walk is done, but the budget left file2 unswept, so
		// reporting completion here would retire the sweep with a room it never read.
		expect(result.swept).toBe(1)
		expect(result.nextCursor).toBe('300_file1')
	})
})
