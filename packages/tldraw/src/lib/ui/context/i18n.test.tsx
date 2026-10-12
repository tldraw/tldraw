import { render, renderHook, screen } from '@testing-library/react'
import { defineMessages, type TLI18nMessage } from '@tldraw/editor'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { defaultUiAssetUrls } from '../assetUrls'
import { DEFAULT_TRANSLATION } from '../hooks/useTranslation/defaultTranslation'
import { TldrawUiTranslationProvider, useTranslation } from '../hooks/useTranslation/useTranslation'
import { AssetUrlsProvider } from './asset-urls'
import { F, isPseudoLocale, useMsg } from './i18n'

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

describe('TldrawUiTranslationProvider', () => {
	function withLocale(
		locale: string,
		overrides?: Record<string, Record<string, string>>
	): React.FC<{ children: React.ReactNode }> {
		return ({ children }) => (
			<AssetUrlsProvider assetUrls={defaultUiAssetUrls}>
				<TldrawUiTranslationProvider locale={locale} overrides={overrides}>
					{children}
				</TldrawUiTranslationProvider>
			</AssetUrlsProvider>
		)
	}

	// An override is local data. Merging it used to live in the same effect as the fetch, so a
	// changed override only landed after another round trip — and an app assembling its overrides
	// as it loads its own strings refetched this catalogue on every identity change.
	it('applies a changed override without refetching', () => {
		const { result, rerender } = renderHook(() => useTranslation(), {
			wrapper: withLocale('en', { en: { 'app.title': 'First' } }),
		})
		expect(result.current('app.title')).toBe('First')
		rerender()
		const { result: second } = renderHook(() => useTranslation(), {
			wrapper: withLocale('en', { en: { 'app.title': 'Second' } }),
		})
		expect(second.current('app.title')).toBe('Second')
	})

	// A locale the SDK ships nothing for falls back to English, and its overrides still have to
	// apply — that's the only place an app-only locale's strings can come from.
	it('applies overrides for a locale the SDK has no catalogue for', () => {
		const { result } = renderHook(() => useTranslation(), {
			wrapper: withLocale('xx-AE', { 'xx-AE': { 'app.title': 'Áççéñtéd' } }),
		})
		expect(result.current('app.title')).toBe('Áççéñtéd')
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
		expect(() => defineMessages({ bad: { defaultMessage: 'No id' } as TLI18nMessage })).toThrow(
			/missing an id/
		)
	})
})
