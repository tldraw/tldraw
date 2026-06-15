import { RoomSnapshot } from '@tldraw/sync-core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Environment } from '../types'
import { defaultWelcomeSnapshotJson } from './defaultWelcomeSnapshot'
import { resolveWelcomeSnapshot } from './resolveWelcomeSnapshot'

vi.mock('../postgres', () => ({
	createPostgresConnectionPool: vi.fn(),
}))
vi.mock('../routes/tla/getPublishedFile', () => ({
	getPublishedRoomSnapshot: vi.fn(),
}))

const { createPostgresConnectionPool } = await import('../postgres')
const { getPublishedRoomSnapshot } = await import('../routes/tla/getPublishedFile')

const env = {} as Environment
const defaultSnapshot = JSON.parse(defaultWelcomeSnapshotJson) as RoomSnapshot

// Stub the Kysely chain `pool.selectFrom('welcome_template').select(...).executeTakeFirst()`.
function mockWelcomeTemplateRow(row: { publishedSlug: string } | undefined | (() => never)) {
	vi.mocked(createPostgresConnectionPool).mockReturnValue({
		selectFrom: () => ({
			select: () => ({
				executeTakeFirst: async () => (typeof row === 'function' ? row() : row),
			}),
		}),
	} as any)
}

afterEach(() => vi.clearAllMocks())

describe('resolveWelcomeSnapshot', () => {
	it('uses the committed default when no welcome template is set', async () => {
		mockWelcomeTemplateRow(undefined)
		const result = await resolveWelcomeSnapshot(env)
		expect(result).toEqual(defaultSnapshot)
		expect(getPublishedRoomSnapshot).not.toHaveBeenCalled()
	})

	it('forks the flagged template’s published snapshot when one is set', async () => {
		const published: RoomSnapshot = {
			documentClock: 0,
			tombstoneHistoryStartsAtClock: 0,
			schema: defaultSnapshot.schema,
			documents: [{ state: { id: 'sentinel' } as any, lastChangedClock: 0 }],
		}
		mockWelcomeTemplateRow({ publishedSlug: 'pub_abc' })
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(published)

		const result = await resolveWelcomeSnapshot(env)
		expect(getPublishedRoomSnapshot).toHaveBeenCalledWith(env, 'pub_abc')
		expect(result).toBe(published)
	})

	it('falls back to the default when the published snapshot can’t be read', async () => {
		mockWelcomeTemplateRow({ publishedSlug: 'pub_abc' })
		vi.mocked(getPublishedRoomSnapshot).mockRejectedValue(new Error('not found'))
		expect(await resolveWelcomeSnapshot(env)).toEqual(defaultSnapshot)
	})

	it('falls back to the default when the published snapshot is missing', async () => {
		mockWelcomeTemplateRow({ publishedSlug: 'pub_abc' })
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(undefined)
		expect(await resolveWelcomeSnapshot(env)).toEqual(defaultSnapshot)
	})

	it('falls back to the default when the lookup itself throws (e.g. table absent)', async () => {
		mockWelcomeTemplateRow(() => {
			throw new Error('relation "welcome_template" does not exist')
		})
		expect(await resolveWelcomeSnapshot(env)).toEqual(defaultSnapshot)
		expect(getPublishedRoomSnapshot).not.toHaveBeenCalled()
	})

	it('always returns a usable snapshot (has documents)', async () => {
		mockWelcomeTemplateRow(undefined)
		const result = await resolveWelcomeSnapshot(env)
		expect(result.documents.length).toBeGreaterThan(0)
	})
})
