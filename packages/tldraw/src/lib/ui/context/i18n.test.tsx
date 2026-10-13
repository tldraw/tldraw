import { readdirSync, readFileSync } from 'fs'
import path from 'path'
import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import { defineMessages, getDeclaredMessages } from '@tldraw/editor'
import * as React from 'react'
import { IntlProvider } from 'react-intl'
import { describe, expect, it, vi } from 'vitest'
import { defaultUiAssetUrls } from '../assetUrls'
import { TldrawUiTranslationProvider, useTranslation } from '../hooks/useTranslation/useTranslation'
import { AssetUrlsProvider } from './asset-urls'
import { F, useTldrawI18n } from './i18n'

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
// these render against the declared English plus whatever overrides are passed.
function withProvider(overrides?: Record<string, Record<string, string>>, locale = 'en') {
	return ({ children }: { children: React.ReactNode }) => (
		<AssetUrlsProvider assetUrls={defaultUiAssetUrls}>
			<TldrawUiTranslationProvider locale={locale} overrides={overrides}>
				{children}
			</TldrawUiTranslationProvider>
		</AssetUrlsProvider>
	)
}

// `defineMessages` is where the English lives; the id it carries is what the UI translates. The
// key-based lookups themselves are covered in useTranslation.test.tsx.
describe('a declared message through msg()', () => {
	it('resolves its id against the catalog', () => {
		const { result } = renderHook(() => useTranslation()(messages.copy.id), {
			wrapper: withProvider(),
		})
		expect(result.current).toBe('Copy')
	})

	// One IntlShape behind the catalogue and the overrides, so an app overrides a key once and a
	// message declared against that key picks it up.
	it('picks up overrides.translations', () => {
		const wrapper = withProvider({ en: { 'action.copy': 'Duplicate it' } })
		const { result } = renderHook(() => useTranslation()(messages.copy.id), { wrapper })
		expect(result.current).toBe('Duplicate it')
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
			wrapper: withLocale('zz', { zz: { 'app.title': 'App only' } }),
		})
		expect(result.current('app.title')).toBe('App only')
	})

	// Only the active locale's overrides used to apply, so an app key missing from them showed its id.
	it("falls back to an app key's English override in another locale", () => {
		const { result } = renderHook(() => useTranslation(), {
			wrapper: withLocale('zz', {
				en: { 'app.title': 'English', 'action.copy': 'Make a copy' },
				zz: {},
			}),
		})
		expect(result.current('app.title')).toBe('English')
		// No SDK catalog for this locale either, so the app's English wording beats the SDK's.
		expect(result.current('action.copy')).toBe('Make a copy')
	})

	it('keeps a catalog string over an English override of the same key', async () => {
		const fetchSpy = vi
			.spyOn(window, 'fetch')
			.mockImplementation(
				async () => ({ ok: true, json: async () => ({ 'action.copy': 'Copier' }) }) as Response
			)
		try {
			const { result } = renderHook(() => useTranslation(), {
				wrapper: withLocale('fr', { en: { 'action.copy': 'Make a copy' } }),
			})
			await waitFor(() => expect(result.current('action.copy')).toBe('Copier'))
		} finally {
			fetchSpy.mockRestore()
		}
	})

	// An empty override is how an app hides a label; react-intl's default shows the id instead.
	it('renders an empty override as empty', () => {
		const { result } = renderHook(() => useTranslation(), {
			wrapper: withLocale('en', { en: { 'action.copy': '' } }),
		})
		expect(result.current('action.copy')).toBe('')
	})
})

describe('rich text in a message', () => {
	// An app marking up part of a string — "<name>Ada</name> mentioned you" — needs the markup
	// inside the message so a translator can move it, rather than split into fragments.
	it('renders a tag through the function given for it', () => {
		render(
			<F
				defaultMessage="<name>{author}</name> mentioned you"
				id="example.mention"
				values={{
					author: 'Ada',
					name: (chunks) => <strong data-testid="who">{chunks}</strong>,
				}}
			/>,
			{ wrapper: withProvider() }
		)
		expect(screen.getByTestId('who').textContent).toBe('Ada')
		expect(screen.getByTestId('who').tagName).toBe('STRONG')
	})
})

describe('defineMessages', () => {
	it('keeps a written id, and its literal type', () => {
		const defined = defineMessages({ copy: { id: 'action.copy', defaultMessage: 'Copy' } })
		expect(defined.copy).toEqual({ id: 'action.copy', defaultMessage: 'Copy' })
		// The literal type is what lets a declared id go where a TLUiTranslationKey is expected.
		const key: 'action.copy' = defined.copy.id
		expect(key).toBe('action.copy')
	})

	// Where a bundler plugin was going to supply the id and none ran — every test in an app that
	// writes its messages that way. Throwing here would mean such an app couldn't be tested.
	it('stands the English in for a missing id', () => {
		const defined = defineMessages({ copy: { defaultMessage: 'Copy' } })
		expect(defined.copy).toEqual({ id: 'Copy', defaultMessage: 'Copy' })
	})

	it('renders as its English when no plugin supplied an id', () => {
		const defined = defineMessages({ greet: { defaultMessage: 'Hello there' } })
		render(<F {...defined.greet} />, { wrapper: withProvider() })
		expect(screen.getByText('Hello there')).toBeTruthy()
	})
})

describe('the message marker', () => {
	// A tool outside the SDK has to be able to tell text that came through `F` from text that never
	// did. tldraw.com's language-debug overlay finds untranslated strings by exactly this class.
	it('wraps a message in a span tools can find', () => {
		const { container } = render(<F {...messages.copy} />, { wrapper: withProvider() })
		const marker = container.querySelector('.i18n-msg')
		expect(marker?.textContent).toBe('Copy')
	})
})

describe('an element as a value', () => {
	// A placeholder filled with an element, rather than a tag wrapped around part of the message.
	// Both keep the sentence whole for the translator; this is the one react-intl itself documents.
	it('substitutes the element into the message', () => {
		render(
			<F
				defaultMessage="Still having trouble? {help}"
				id="example.trouble"
				values={{
					help: (
						<a data-testid="help" href="/help">
							Get help
						</a>
					),
				}}
			/>,
			{ wrapper: withProvider() }
		)
		expect(screen.getByTestId('help').tagName).toBe('A')
		expect(screen.getByTestId('help').textContent).toBe('Get help')
	})
})

describe('an app catalog outside the SDK provider', () => {
	// Without the merge in `TldrawUiTranslationProvider`, an app's own components inside
	// `TldrawUiContextProvider` lost their catalog and rendered English in every locale.
	it('still resolves inside the SDK provider', () => {
		const SdkProvider = withProvider()
		render(
			<IntlProvider locale="en" defaultLocale="en" messages={{ 'app.hello': 'From the app' }}>
				<SdkProvider>
					<F id="app.hello" defaultMessage="Hello" />
				</SdkProvider>
			</IntlProvider>
		)
		expect(screen.getByText('From the app')).toBeTruthy()
	})
})

describe('the i18n adapter the editor gets', () => {
	function adapterWith(messages: Record<string, string>) {
		const SdkProvider = withProvider({ en: messages })
		const { result } = renderHook(() => useTldrawI18n(), { wrapper: SdkProvider })
		return result.current()
	}

	// Given only the id, the fallback substituted the English whole and put a plural message's own
	// ICU source into an upload toast.
	it('formats the English for an id the catalog has no entry for', () => {
		const i18n = adapterWith({})
		expect(
			i18n.translate(
				{
					id: 'app.added-files',
					defaultMessage: '{total, plural, one {Added # file.} other {Added # files.}}',
				},
				{ total: 3 }
			)
		).toBe('Added 3 files.')
	})

	// The requested locale, not the catalog that loaded: for a locale the SDK ships none for, the
	// loaded one is English, and an app formatting dates by `locale` then got English dates.
	it('reports the requested locale, not the catalog that loaded', () => {
		const { result } = renderHook(() => useTldrawI18n(), { wrapper: withProvider(undefined, 'zz') })
		expect(result.current().locale).toBe('zz')
	})

	it('still prefers a translation when there is one', () => {
		const i18n = adapterWith({ 'app.added-files': 'Added {total}' })
		expect(i18n.translate({ id: 'app.added-files', defaultMessage: 'x' }, { total: 2 })).toBe(
			'Added 2'
		)
	})
})

describe('the declared English', () => {
	// A chunk imported after mount — a lazily loaded @tldraw/commenting — declares labels that are
	// looked up by id. A snapshot taken at mount left them rendering as their ids.
	it('picks up a message declared after mount', () => {
		const { result } = renderHook(() => useTranslation(), { wrapper: withProvider() })
		expect(result.current('test.declared-late')).toBe('test.declared-late')
		act(() => {
			defineMessages({ late: { id: 'test.declared-late', defaultMessage: 'Declared late' } })
		})
		expect(result.current('test.declared-late')).toBe('Declared late')
	})

	// Stands in for the English catalog the SDK no longer bundles. Fails when a declaring module is
	// never imported, as `consumerMessages` wasn't. Exempt: messages inline on an `<F>`, which carry
	// their own English, and @tldraw/commenting's, which `tldraw` doesn't import.
	it('covers main.json once the package has loaded', async () => {
		await import('../../../index')
		const { default: main } = await import('../../../../../../assets/translations/main.json')
		const src = path.resolve(__dirname, '../../..')
		const inlineIds = new Set<string>()
		for (const file of readdirSync(src, { recursive: true })) {
			if (!String(file).endsWith('.tsx')) continue
			const source = readFileSync(path.join(src, String(file)), 'utf8')
			for (const [, id] of source.matchAll(/<F\b[^>]*?\bid="([^"]+)"/g)) inlineIds.add(id)
		}
		const declared = getDeclaredMessages()
		const missing = Object.keys(main).filter(
			(id) =>
				!(id in declared) &&
				!inlineIds.has(id) &&
				!id.startsWith('comments.') &&
				id !== 'tool.comment'
		)
		expect(missing).toEqual([])
	})
})
