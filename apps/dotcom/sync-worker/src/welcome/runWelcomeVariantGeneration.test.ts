import { RoomSnapshot } from '@tldraw/sync-core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Environment } from '../types'
import { defaultWelcomeSnapshotJson } from './defaultWelcomeSnapshot'
import { runWelcomeVariantGeneration } from './runWelcomeVariantGeneration'
import { welcomeVariantR2Key } from './welcomeVariants'

vi.mock('../routes/tla/getPublishedFile', () => ({ getPublishedRoomSnapshot: vi.fn() }))
vi.mock('./loadWelcomeCatalog', async (orig) => ({
	...(await orig<typeof import('./loadWelcomeCatalog')>()),
	loadWelcomeCatalog: vi.fn(),
}))

const { getPublishedRoomSnapshot } = await import('../routes/tla/getPublishedFile')
const { loadWelcomeCatalog } = await import('./loadWelcomeCatalog')

const source = () => JSON.parse(defaultWelcomeSnapshotJson) as RoomSnapshot

const put = vi.fn(async (_key: string, _body: string) => {})
const env = { ROOM_SNAPSHOTS: { put } } as unknown as Environment

function titleText(json: string): string {
	const snap = JSON.parse(json) as RoomSnapshot
	const rt = (
		snap.documents.find((d) => (d.state as { id?: string }).id === 'shape:welcome-title')
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

afterEach(() => vi.clearAllMocks())

describe('runWelcomeVariantGeneration', () => {
	it('throws when the source template has no published snapshot', async () => {
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(undefined)
		await expect(runWelcomeVariantGeneration(env, 'pub_abc')).rejects.toThrow(
			'no published snapshot'
		)
		expect(put).not.toHaveBeenCalled()
	})

	it('writes a variant only for locales that actually have welcome translations', async () => {
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(source())
		// fr is translated; everything else returns a catalog with no welcome.* keys → skipped.
		vi.mocked(loadWelcomeCatalog).mockImplementation(async (_env, locale) =>
			locale === 'fr'
				? { 'welcome.title': 'Bienvenue dans votre espace de travail' }
				: { 'some.other.key': 'x' }
		)

		const generated = await runWelcomeVariantGeneration(env, 'pub_abc')

		expect(generated).toEqual(['fr'])
		expect(put).toHaveBeenCalledOnce()
		const [key, body] = put.mock.calls[0]
		expect(key).toBe(welcomeVariantR2Key('pub_abc', 'fr'))
		expect(titleText(body as string)).toBe('Bienvenue dans votre espace de travail')
	})
})
