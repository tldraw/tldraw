import { afterEach, describe, expect, it, vi } from 'vitest'
import { TLUiAssetUrls } from '../../assetUrls'
import { EN_TRANSLATION, fetchTranslation } from './translations'

const assetUrls = {
	translations: { en: '/translations/en.json', fr: '/translations/fr.json' },
} as unknown as TLUiAssetUrls

afterEach(() => {
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
})

describe('fetchTranslation', () => {
	it('returns english without fetching anything', async () => {
		vi.stubGlobal('fetch', vi.fn())

		const translation = await fetchTranslation('en', assetUrls)

		expect(translation).toBe(EN_TRANSLATION)
		expect(fetch).not.toHaveBeenCalled()
	})

	it('falls back to english when the fetch rejects', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
		vi.spyOn(console, 'warn').mockImplementation(() => {})

		const translation = await fetchTranslation('fr', assetUrls)

		expect(translation).toBe(EN_TRANSLATION)
	})

	it('falls back to english when the locale file is not json', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(new Response('<!doctype html>', { status: 404 }))
		)
		vi.spyOn(console, 'warn').mockImplementation(() => {})

		const translation = await fetchTranslation('fr', assetUrls)

		expect(translation).toBe(EN_TRANSLATION)
	})

	it('returns the fetched locale messages', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(new Response(JSON.stringify({ 'action.undo': 'Annuler' })))
		)
		vi.spyOn(console, 'warn').mockImplementation(() => {})

		const translation = await fetchTranslation('fr', assetUrls)

		expect(translation.locale).toBe('fr')
		expect(translation.messages['action.undo']).toBe('Annuler')
	})
})
