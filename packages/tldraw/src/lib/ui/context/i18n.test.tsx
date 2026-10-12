import { render, renderHook, screen } from '@testing-library/react'
import { defineMessages } from '@tldraw/editor'
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
function withProvider(overrides?: Record<string, Record<string, string>>, locale = 'en') {
	return ({ children }: { children: React.ReactNode }) => (
		<AssetUrlsProvider assetUrls={defaultUiAssetUrls}>
			<TldrawUiTranslationProvider locale={locale} overrides={overrides}>
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

describe('pseudo locales', () => {
	// These aren't languages: they transform the English so an unlocalised string stands out, and a
	// layout that can't take a longer one shows it. dotcom's language-debug mode relies on them.
	it('accents the text under xx-AE', () => {
		render(<F defaultMessage="Your files" id="example.files" />, {
			wrapper: withProvider(undefined, 'xx-AE'),
		})
		expect(screen.getByText('Ýóúř ƒíłéš')).toBeTruthy()
	})

	it('lengthens the text under xx-LS', () => {
		render(<F defaultMessage="Your files" id="example.files" />, {
			wrapper: withProvider(undefined, 'xx-LS'),
		})
		expect(screen.getByText(/^Your files loooo/)).toBeTruthy()
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
		expect(marker?.textContent).toBe(DEFAULT_TRANSLATION['action.copy'])
	})

	it('wraps a pseudo-locale message too, which is where the overlay is used', () => {
		const { container } = render(<F defaultMessage="Your files" id="example.files" />, {
			wrapper: withProvider(undefined, 'xx-AE'),
		})
		expect(container.querySelector('.i18n-msg')?.textContent).toBe('Ýóúř ƒíłéš')
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
