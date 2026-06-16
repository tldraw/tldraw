import { afterEach, describe, expect, it, vi } from 'vitest'
import { Environment } from '../types'
import { loadWelcomeCatalog, localeCandidates } from './loadWelcomeCatalog'

const lokalise = (entries: Record<string, string>) =>
	Object.fromEntries(Object.entries(entries).map(([id, translation]) => [id, { translation }]))

afterEach(() => vi.restoreAllMocks())

describe('localeCandidates', () => {
	it('tries the region then the base language', () => {
		expect(localeCandidates('fr-FR')).toEqual(['fr-FR', 'fr'])
		expect(localeCandidates('fr')).toEqual(['fr'])
		expect(localeCandidates('en')).toEqual(['en'])
	})
})

describe('loadWelcomeCatalog', () => {
	it('returns undefined when no app origin is configured', async () => {
		expect(await loadWelcomeCatalog({} as Environment, 'fr')).toBeUndefined()
	})

	it('fetches the lokalise catalog and flattens it to id -> translation', async () => {
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(new Response(JSON.stringify(lokalise({ 'welcome.title': 'Bienvenue' }))))
		const env = { APP_ORIGIN: 'https://app.example' } as Environment

		expect(await loadWelcomeCatalog(env, 'fr')).toEqual({ 'welcome.title': 'Bienvenue' })
		expect(fetchSpy).toHaveBeenCalledWith('https://app.example/tla/locales/fr.json')
	})

	it('falls back from region to base language on a miss', async () => {
		vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
			String(url).endsWith('/fr.json')
				? new Response(JSON.stringify(lokalise({ 'welcome.title': 'Bienvenue' })))
				: new Response('not found', { status: 404 })
		)
		const env = { APP_ORIGIN: 'https://app.example' } as Environment

		expect(await loadWelcomeCatalog(env, 'fr-FR')).toEqual({ 'welcome.title': 'Bienvenue' })
	})

	it('returns undefined when no candidate catalog exists', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('not found', { status: 404 }))
		const env = { APP_ORIGIN: 'https://app.example' } as Environment
		expect(await loadWelcomeCatalog(env, 'xx')).toBeUndefined()
	})
})
