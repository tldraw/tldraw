import { afterEach, describe, expect, it, vi } from 'vitest'
import { getPublishedFileInfo, getPublishedRoomSnapshot } from './getPublishedFile'
import type { FakePostgresModule } from './screenshotTestHelpers'

// The Postgres seam is faked rather than the reader mocked, so these can tell a skipped round trip
// from a skipped query — the same stand-in as getSharedFile.test.ts (see screenshotTestHelpers).
vi.mock('../../postgres', async () =>
	(await import('./screenshotTestHelpers')).makeFakePostgresModule()
)
const pg = (await import('../../postgres')) as unknown as FakePostgresModule

// The `db` option on getPublishedFileInfo — same contract as getSharedFileInfo's: a caller that
// holds an invocation-scoped pool (the queue batch loop in worker.ts) lends it, and withPostgres
// (pinned in postgres.test.ts) leaves its lifetime alone; without one, the per-call
// create-and-destroy stands.
describe('getPublishedFileInfo', () => {
	const file = { id: 'file-1', published: true, lastPublished: 7 }

	function makeEnv() {
		return { SNAPSHOT_SLUG_TO_PARENT_SLUG: { get: vi.fn().mockResolvedValue('file-1') } } as any
	}

	afterEach(() => {
		vi.resetAllMocks()
	})

	it('queries once through withPostgres under its own telemetry name when no db is supplied', async () => {
		pg.executeTakeFirst.mockResolvedValue(file)
		const env = makeEnv()

		await expect(getPublishedFileInfo(env, 'pub-slug')).resolves.toEqual(file)
		expect(pg.withPostgres).toHaveBeenCalledExactlyOnceWith(
			env,
			'getPublishedFileInfo',
			undefined,
			expect.any(Function)
		)
		expect(pg.executeTakeFirst).toHaveBeenCalledTimes(1)
	})

	it('hands a caller-supplied db through, still querying exactly once', async () => {
		pg.executeTakeFirst.mockResolvedValue(file)
		const env = makeEnv()

		await expect(getPublishedFileInfo(env, 'pub-slug', pg.db)).resolves.toEqual(file)
		expect(pg.withPostgres).toHaveBeenCalledExactlyOnceWith(
			env,
			'getPublishedFileInfo',
			pg.db,
			expect.any(Function)
		)
		expect(pg.executeTakeFirst).toHaveBeenCalledTimes(1)
	})

	// The KV lookup is the gate in front of the pool: an unknown published slug is a
	// crawler-reachable outcome, and it must be answered from KV alone rather than cost a Postgres
	// connection per hit.
	it('answers an unknown slug from KV without touching Postgres', async () => {
		const env = { SNAPSHOT_SLUG_TO_PARENT_SLUG: { get: vi.fn().mockResolvedValue(null) } } as any

		await expect(getPublishedFileInfo(env, 'unknown-slug')).resolves.toBeNull()
		expect(pg.withPostgres).not.toHaveBeenCalled()
		expect(pg.executeTakeFirst).not.toHaveBeenCalled()
	})
})

describe('getPublishedRoomSnapshot', () => {
	const snapshot = { documents: [], schema: { schemaVersion: 2, sequences: {} } }

	function makeEnv() {
		return {
			SNAPSHOT_SLUG_TO_PARENT_SLUG: { get: vi.fn().mockResolvedValue('file-1') },
			ROOM_SNAPSHOTS: { get: vi.fn().mockResolvedValue({ json: async () => snapshot }) },
		} as any
	}

	afterEach(() => {
		vi.resetAllMocks()
	})

	// `db` shares a connection, never the answer: the row re-read is the serve-time published gate
	// and always runs — a supplied pool only decides which connection it rides. This is what lets
	// the queue consumer's snapshot read join the batch pool without weakening the gate.
	it('hands a caller-supplied db to the file re-read, which still runs', async () => {
		pg.executeTakeFirst.mockResolvedValue({ id: 'file-1', published: true, lastPublished: 7 })

		await expect(getPublishedRoomSnapshot(makeEnv(), 'pub-slug', pg.db)).resolves.toEqual(snapshot)
		expect(pg.withPostgres).toHaveBeenCalledExactlyOnceWith(
			expect.anything(),
			'getPublishedFileInfo',
			pg.db,
			expect.any(Function)
		)
		expect(pg.executeTakeFirst).toHaveBeenCalledTimes(1)
	})

	it('resolves undefined for an unpublished file without reading the snapshot', async () => {
		pg.executeTakeFirst.mockResolvedValue({ id: 'file-1', published: false, lastPublished: 7 })
		const env = makeEnv()

		await expect(getPublishedRoomSnapshot(env, 'pub-slug')).resolves.toBeUndefined()
		expect(env.ROOM_SNAPSHOTS.get).not.toHaveBeenCalled()
	})
})
