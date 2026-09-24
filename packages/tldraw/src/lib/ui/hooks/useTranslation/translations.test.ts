import { afterEach, describe, expect, it, vi } from 'vitest'
import { TLUiAssetUrls } from '../../assetUrls'
import { DEFAULT_TRANSLATION } from './defaultTranslation'
import { fetchTranslation } from './translations'

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

		expect(translation.locale).toBe('en')
		expect(translation.messages).toBe(DEFAULT_TRANSLATION)
		expect(fetch).not.toHaveBeenCalled()
	})

	it('falls back to english when the fetch rejects', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
		vi.spyOn(console, 'warn').mockImplementation(() => {})

		const translation = await fetchTranslation('fr', assetUrls)

		expect(translation.locale).toBe('en')
		expect(translation.messages).toBe(DEFAULT_TRANSLATION)
	})

	it('falls back to english when the locale file is not json', async () => {
		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockResolvedValueOnce(new Response('{}'))
				.mockResolvedValueOnce(new Response('<!doctype html>', { status: 404 }))
		)
		vi.spyOn(console, 'warn').mockImplementation(() => {})

		const translation = await fetchTranslation('fr', assetUrls)

		expect(translation.locale).toBe('en')
	})

	it('merges a fetched locale over english', async () => {
		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockResolvedValueOnce(new Response('{}'))
				.mockResolvedValueOnce(new Response(JSON.stringify({ 'action.undo': 'Annuler' })))
		)

		const translation = await fetchTranslation('fr', assetUrls)

		expect(translation.locale).toBe('fr')
		expect(translation.messages['action.undo']).toBe('Annuler')
		expect(translation.messages['action.redo']).toBe(DEFAULT_TRANSLATION['action.redo'])
	})
})
