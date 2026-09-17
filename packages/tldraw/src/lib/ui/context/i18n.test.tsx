import { render, renderHook, screen } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { defaultUiAssetUrls } from '../assetUrls'
import { DEFAULT_TRANSLATION } from '../hooks/useTranslation/defaultTranslation'
import { TldrawUiTranslationProvider, useTranslation } from '../hooks/useTranslation/useTranslation'
import { AssetUrlsProvider } from './asset-urls'
import { F, defineMessages, isPseudoLocale, useMsg, type TLUiMessageDescriptor } from './i18n'

vi.unmock('./useTranslation')
vi.unmock('../hooks/useTranslation/useTranslation')

const messages = defineMessages({
	copy: { id: 'action.copy', defaultMessage: 'Copy' },
	replies: {
		id: 'comments.replies',
		defaultMessage: '{count, plural, one {# reply} other {# replies}}',
	},
})

// The provider fetches a locale over the network; 'en' short-circuits to the bundled defaults, so
// these render against DEFAULT_TRANSLATION plus whatever overrides are passed.
function withProvider(overrides?: Record<string, Record<string, string>>) {
	return ({ children }: { children: React.ReactNode }) => (
		<AssetUrlsProvider assetUrls={defaultUiAssetUrls}>
			<TldrawUiTranslationProvider locale="en" overrides={overrides}>
				{children}
			</TldrawUiTranslationProvider>
		</AssetUrlsProvider>
	)
}

describe('useMsg', () => {
	it('resolves a descriptor against the catalog', () => {
		const { result } = renderHook(() => useMsg(messages.copy), { wrapper: withProvider() })
		expect(result.current).toBe(DEFAULT_TRANSLATION['action.copy'])
	})

	it('pluralises through ICU', () => {
		const { result } = renderHook(() => useMsg(messages.replies, { count: 3 }), {
			wrapper: withProvider(),
		})
		expect(result.current).toBe('3 replies')
	})

	// The whole point of one IntlShape: an app overrides a key once and both APIs pick it up.
	it('picks up overrides.translations', () => {
		const wrapper = withProvider({ en: { 'action.copy': 'Duplicate it' } })
		const { result } = renderHook(() => useMsg(messages.copy), { wrapper })
		expect(result.current).toBe('Duplicate it')
	})

	it('agrees with msg() for the same key', () => {
		const wrapper = withProvider({ en: { 'action.copy': 'Snap' } })
		const { result } = renderHook(
			() => ({ viaKey: useTranslation()('action.copy'), viaDescriptor: useMsg(messages.copy) }),
			{ wrapper }
		)
		expect(result.current.viaKey).toBe(result.current.viaDescriptor)
		expect(result.current.viaKey).toBe('Snap')
	})
})

describe('F', () => {
	it('renders the catalog message, not the default message', () => {
		render(<F {...messages.copy} />, {
			wrapper: withProvider({ en: { 'action.copy': 'Kopieer' } }),
		})
		expect(screen.getByText('Kopieer')).toBeTruthy()
	})
})

describe('isPseudoLocale', () => {
	it('recognises the pseudo locales and nothing else', () => {
		expect(isPseudoLocale('xx-AE')).toBe(true)
		expect(isPseudoLocale('xx-LS')).toBe(true)
		expect(isPseudoLocale('en')).toBe(false)
		expect(isPseudoLocale('ar')).toBe(false)
	})
})

describe('defineMessages', () => {
	it('rejects a descriptor with no id, so nothing unextractable ships', () => {
		expect(() =>
			defineMessages({ bad: { defaultMessage: 'No id' } as TLUiMessageDescriptor })
		).toThrow(/missing an id/)
	})
})
