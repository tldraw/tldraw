import { RoomSnapshot } from '@tldraw/sync-core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Environment } from '../types'
import { defaultWelcomeSnapshotJson } from './defaultWelcomeSnapshot'
import { resolveWelcomeSnapshot } from './resolveWelcomeSnapshot'
import { welcomeVariantR2Key } from './welcomeVariants'

vi.mock('../postgres', () => ({
	createPostgresConnectionPool: vi.fn(),
}))
vi.mock('../routes/tla/getPublishedFile', () => ({
	getPublishedRoomSnapshot: vi.fn(),
}))
// Keep localeCandidates real; stub only the network fetch.
vi.mock('./loadWelcomeCatalog', async (orig) => ({
	...(await orig<typeof import('./loadWelcomeCatalog')>()),
	loadWelcomeCatalog: vi.fn(),
}))

const { createPostgresConnectionPool } = await import('../postgres')
const { getPublishedRoomSnapshot } = await import('../routes/tla/getPublishedFile')
const { loadWelcomeCatalog } = await import('./loadWelcomeCatalog')

const defaultSnapshot = JSON.parse(defaultWelcomeSnapshotJson) as RoomSnapshot

const destroy = vi.fn(async () => {})
// env.ROOM_SNAPSHOTS.get is consulted for per-locale variants; default to a miss.
const r2Get = vi.fn(async (_key: string) => null as null | { json(): Promise<unknown> })
const env = { ROOM_SNAPSHOTS: { get: r2Get } } as unknown as Environment

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

function titleText(snapshot: RoomSnapshot): string {
	const rt = (
		snapshot.documents.find((d) => (d.state as { id?: string }).id === 'shape:welcome-title')
			?.state as { props?: { richText?: { content?: any[] } } }
	)?.props?.richText
	const out: string[] = []
	const walk = (n: any) => {
		if (n?.type === 'text') out.push(n.text)
		n?.content?.forEach(walk)
	}
	rt?.content?.forEach(walk)
	return out.join('')
}

afterEach(() => {
	vi.clearAllMocks()
	r2Get.mockResolvedValue(null)
})

describe('resolveWelcomeSnapshot', () => {
	it('uses the committed default — silently — when no welcome template is set', async () => {
		const reportError = vi.fn()
		mockWelcomeTemplateRow(undefined)
		const result = await resolveWelcomeSnapshot(env, { reportError })
		expect(result).toEqual(defaultSnapshot)
		expect(getPublishedRoomSnapshot).not.toHaveBeenCalled()
		expect(reportError).not.toHaveBeenCalled()
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

		const result = await resolveWelcomeSnapshot(env, {})
		expect(getPublishedRoomSnapshot).toHaveBeenCalledWith(env, 'pub_abc')
		expect(result).toBe(published)
	})

	it('returns a pre-generated per-locale variant when one exists in R2', async () => {
		const variant: RoomSnapshot = {
			documentClock: 0,
			tombstoneHistoryStartsAtClock: 0,
			schema: defaultSnapshot.schema,
			documents: [{ state: { id: 'fr-variant' } as any, lastChangedClock: 0 }],
		}
		mockWelcomeTemplateRow({ publishedSlug: 'pub_abc' })
		r2Get.mockImplementation(async (key) =>
			key === welcomeVariantR2Key('pub_abc', 'fr') ? { json: async () => variant } : null
		)

		const result = await resolveWelcomeSnapshot(env, { locale: 'fr' })
		expect(result).toBe(variant)
		// found the variant → no need to fall back to the source-language published snapshot
		expect(getPublishedRoomSnapshot).not.toHaveBeenCalled()
	})

	it('falls back to the source-language template when no variant exists for the locale', async () => {
		const published: RoomSnapshot = {
			documentClock: 0,
			tombstoneHistoryStartsAtClock: 0,
			schema: defaultSnapshot.schema,
			documents: [{ state: { id: 'src' } as any, lastChangedClock: 0 }],
		}
		mockWelcomeTemplateRow({ publishedSlug: 'pub_abc' })
		r2Get.mockResolvedValue(null)
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(published)

		const result = await resolveWelcomeSnapshot(env, { locale: 'fr-FR' })
		expect(result).toBe(published)
	})

	it('localizes the committed default from the catalog when no template is set', async () => {
		mockWelcomeTemplateRow(undefined)
		vi.mocked(loadWelcomeCatalog).mockResolvedValue({
			'welcome.title': 'Bienvenue dans votre espace de travail',
		})
		const result = await resolveWelcomeSnapshot(env, { locale: 'fr' })
		expect(titleText(result)).toBe('Bienvenue dans votre espace de travail')
		expect(loadWelcomeCatalog).toHaveBeenCalledWith(env, 'fr')
	})

	it('serves the English default without fetching a catalog for English locales', async () => {
		mockWelcomeTemplateRow(undefined)
		const result = await resolveWelcomeSnapshot(env, { locale: 'en-US' })
		expect(titleText(result)).toBe('Welcome to your workspace')
		expect(loadWelcomeCatalog).not.toHaveBeenCalled()
	})

	it('falls back to the default AND reports when a set template’s snapshot throws', async () => {
		const reportError = vi.fn()
		mockWelcomeTemplateRow({ publishedSlug: 'pub_abc' })
		vi.mocked(getPublishedRoomSnapshot).mockRejectedValue(new Error('not published'))
		expect(await resolveWelcomeSnapshot(env, { reportError })).toEqual(defaultSnapshot)
		expect(reportError).toHaveBeenCalledOnce()
	})

	it('falls back to the default AND reports when a set template has no published snapshot', async () => {
		const reportError = vi.fn()
		mockWelcomeTemplateRow({ publishedSlug: 'pub_abc' })
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(undefined)
		expect(await resolveWelcomeSnapshot(env, { reportError })).toEqual(defaultSnapshot)
		expect(reportError).toHaveBeenCalledOnce()
	})

	it('falls back to the default AND reports when the pointer lookup throws', async () => {
		const reportError = vi.fn()
		mockWelcomeTemplateRow(() => {
			throw new Error('relation "welcome_template" does not exist')
		})
		expect(await resolveWelcomeSnapshot(env, { reportError })).toEqual(defaultSnapshot)
		expect(getPublishedRoomSnapshot).not.toHaveBeenCalled()
		expect(reportError).toHaveBeenCalledOnce()
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
