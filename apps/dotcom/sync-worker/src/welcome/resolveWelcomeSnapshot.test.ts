import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { DEFAULT_INITIAL_SNAPSHOT, RoomSnapshot } from '@tldraw/sync-core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Environment } from '../types'
import { resolveWelcomeSnapshot } from './resolveWelcomeSnapshot'

vi.mock('../postgres', () => ({
	createPostgresConnectionPool: vi.fn(),
}))
vi.mock('../routes/tla/getPublishedFile', () => ({
	getPublishedRoomSnapshot: vi.fn(),
}))
// Spy on the default loader while keeping the real implementation, so the failure test can
// reject one call without fighting the module-level JSON cache inside defaultWelcomeSnapshot.
vi.mock('./defaultWelcomeSnapshot', async (importOriginal) => {
	const actual = await importOriginal<typeof import('./defaultWelcomeSnapshot')>()
	return { ...actual, loadDefaultWelcomeSnapshot: vi.fn(actual.loadDefaultWelcomeSnapshot) }
})

const { createPostgresConnectionPool } = await import('../postgres')
const { getPublishedRoomSnapshot } = await import('../routes/tla/getPublishedFile')
const { loadDefaultWelcomeSnapshot } = await import('./defaultWelcomeSnapshot')

// The default lives as a Workers Static Asset; stand in a minimal ASSETS binding that returns
// the committed JSON so the resolver's fallback path works.
const defaultWelcomeSnapshotJson = readFileSync(
	fileURLToPath(new URL('../../assets/welcome-snapshot.json', import.meta.url)),
	'utf8'
)
const defaultSnapshot = JSON.parse(defaultWelcomeSnapshotJson) as RoomSnapshot
const env = {
	ASSETS: { fetch: async () => new Response(defaultWelcomeSnapshotJson) },
} as unknown as Environment

const destroy = vi.fn(async () => {})

// Stub the Kysely chain `pool.selectFrom('welcome_template').select(...).executeTakeFirst()`
// plus `pool.destroy()`.
function mockWelcomeTemplateRow(row: { publishedSlug: string } | undefined | (() => never)) {
	vi.mocked(createPostgresConnectionPool).mockReturnValue({
		selectFrom: () => ({
			select: () => ({
				executeTakeFirst: async () => (typeof row === 'function' ? row() : row),
			}),
		}),
		destroy,
	} as any)
}

afterEach(() => vi.clearAllMocks())

describe('resolveWelcomeSnapshot', () => {
	it('uses the committed default — silently — when no welcome template is set', async () => {
		const reportError = vi.fn()
		mockWelcomeTemplateRow(undefined)
		const result = await resolveWelcomeSnapshot(env, reportError)
		expect(result).toEqual(defaultSnapshot)
		expect(getPublishedRoomSnapshot).not.toHaveBeenCalled()
		expect(reportError).not.toHaveBeenCalled()
	})

	it('forks the flagged template’s published snapshot when one is set', async () => {
		const reportError = vi.fn()
		const published: RoomSnapshot = {
			documentClock: 0,
			tombstoneHistoryStartsAtClock: 0,
			schema: defaultSnapshot.schema,
			documents: [{ state: { id: 'sentinel' } as any, lastChangedClock: 0 }],
		}
		mockWelcomeTemplateRow({ publishedSlug: 'pub_abc' })
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(published)

		const result = await resolveWelcomeSnapshot(env, reportError)
		expect(getPublishedRoomSnapshot).toHaveBeenCalledWith(env, 'pub_abc')
		expect(result).toBe(published)
		expect(reportError).not.toHaveBeenCalled()
	})

	it('falls back to the default AND reports when a set template’s snapshot throws', async () => {
		const reportError = vi.fn()
		mockWelcomeTemplateRow({ publishedSlug: 'pub_abc' })
		vi.mocked(getPublishedRoomSnapshot).mockRejectedValue(new Error('not published'))
		expect(await resolveWelcomeSnapshot(env, reportError)).toEqual(defaultSnapshot)
		expect(reportError).toHaveBeenCalledOnce()
	})

	it('falls back to the default AND reports when a set template has no published snapshot', async () => {
		const reportError = vi.fn()
		mockWelcomeTemplateRow({ publishedSlug: 'pub_abc' })
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(undefined)
		expect(await resolveWelcomeSnapshot(env, reportError)).toEqual(defaultSnapshot)
		expect(reportError).toHaveBeenCalledOnce()
	})

	it('falls back to the default AND reports when the pointer lookup throws', async () => {
		const reportError = vi.fn()
		mockWelcomeTemplateRow(() => {
			throw new Error('relation "welcome_template" does not exist')
		})
		expect(await resolveWelcomeSnapshot(env, reportError)).toEqual(defaultSnapshot)
		expect(getPublishedRoomSnapshot).not.toHaveBeenCalled()
		expect(reportError).toHaveBeenCalledOnce()
	})

	it('degrades to the empty-room seed AND reports when even the default fails to load', async () => {
		const reportError = vi.fn()
		const error = new Error('failed to load default welcome snapshot: 404')
		mockWelcomeTemplateRow(undefined)
		vi.mocked(loadDefaultWelcomeSnapshot).mockRejectedValueOnce(error)
		expect(await resolveWelcomeSnapshot(env, reportError)).toBe(DEFAULT_INITIAL_SNAPSHOT)
		expect(reportError).toHaveBeenCalledExactlyOnceWith(error)
	})

	it('destroys the Postgres pool on every path (DO hibernation hygiene)', async () => {
		mockWelcomeTemplateRow(undefined)
		await resolveWelcomeSnapshot(env)
		expect(destroy).toHaveBeenCalledOnce()
	})

	it('works without a reportError callback', async () => {
		mockWelcomeTemplateRow({ publishedSlug: 'pub_abc' })
		vi.mocked(getPublishedRoomSnapshot).mockRejectedValue(new Error('boom'))
		expect(await resolveWelcomeSnapshot(env)).toEqual(defaultSnapshot)
	})
})
