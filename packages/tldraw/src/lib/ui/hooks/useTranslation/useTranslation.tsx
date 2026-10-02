import { warnOnce } from '@tldraw/editor'
import * as React from 'react'
import {
	IntlContext,
	IntlProvider,
	ReactIntlErrorCode,
	createIntl,
	createIntlCache,
	type IntlConfig,
} from 'react-intl'
import { useAssetUrls } from '../../context/asset-urls'
import { DEFAULT_TRANSLATION } from './defaultTranslation'
import { TLUiTranslationKey } from './TLUiTranslationKey'
import { TLUiTranslation, fetchTranslation } from './translations'

/** @public */
export interface TLUiTranslationProviderProps {
	children: React.ReactNode
	locale: string
	/**
	 * A collection of overrides different locales.
	 *
	 * @example
	 *
	 * ```ts
	 * <TranslationProvider overrides={{ en: { 'style-panel.styles': 'Properties' } }} />
	 * ```
	 */
	overrides?: Record<string, Record<string, string>>
}

/** @public */
export type TLUiTranslationContextType = TLUiTranslation

/** @internal */
export const TranslationsContext = React.createContext<TLUiTranslationContextType | null>(null)

/** @public */
export function useCurrentTranslation() {
	const translations = React.useContext(TranslationsContext)
	if (!translations) {
		throw new Error('useCurrentTranslation must be used inside of <TldrawUiContextProvider />')
	}
	return translations
}

/**
 * Like {@link useCurrentTranslation}, but returns `null` instead of throwing when used outside
 * of a `<TldrawUiTranslationProvider />` / `<TldrawUiContextProvider />`.
 *
 * @public
 */
export function useMaybeCurrentTranslation() {
	return React.useContext(TranslationsContext)
}

/**
 * Provides a translation context to the editor. Wrap this around components that use
 * `useTranslation` (such as `TldrawSelectionForeground`) when you don't want to use the
 * full `TldrawUiContextProvider`. Must be rendered inside an `AssetUrlsProvider`.
 *
 * @public @react
 */
export function TldrawUiTranslationProvider({
	overrides,
	locale,
	children,
}: TLUiTranslationProviderProps) {
	const getAssetUrl = useAssetUrls()

	const [currentTranslation, setCurrentTranslation] = React.useState<TLUiTranslation>(() => ({
		locale: 'en',
		label: 'English',
		dir: 'ltr',
		messages: overrides?.en ? { ...DEFAULT_TRANSLATION, ...overrides.en } : DEFAULT_TRANSLATION,
	}))

	React.useEffect(() => {
		let isCancelled = false

		async function loadTranslation() {
			const translation = await fetchTranslation(locale, getAssetUrl)
			if (isCancelled) return

			const localeOverrides = overrides?.[locale]
			setCurrentTranslation(
				localeOverrides
					? { ...translation, messages: { ...translation.messages, ...localeOverrides } }
					: translation
			)
		}

		loadTranslation()

		return () => {
			isCancelled = true
		}
	}, [getAssetUrl, locale, overrides])

	return (
		<TranslationsContext.Provider value={currentTranslation}>
			{/* One IntlShape behind both APIs: `msg()` by key and `<F>`/`useMsg()` by descriptor
			    read the same merged catalog, so an app's `overrides.translations` reaches both. */}
			<IntlProvider
				locale={currentTranslation.locale}
				defaultLocale="en"
				messages={currentTranslation.messages}
				onError={onTranslationError}
			>
				{children}
			</IntlProvider>
		</TranslationsContext.Provider>
	)
}

/**
 * Values substituted into a message's ICU placeholders.
 *
 * @public
 */
export type TLUiTranslationValues = Record<
	string,
	string | number | bigint | boolean | Date | null | undefined
>

// Returning the key verbatim for an unknown id is documented behaviour: apps pass their own keys
// and plain text through `msg()`. Only surface errors that mean a message is actually malformed.
const onTranslationError: IntlConfig['onError'] = (error) => {
	if (error.code === ReactIntlErrorCode.MISSING_TRANSLATION) return
	if (process.env.NODE_ENV !== 'production') console.error(error)
}

// One cache for the intl instances built below, as formatjs recommends, so that repeated mounts
// don't leak a formatter cache each.
const intlCache = createIntlCache()

/**
 * Returns a function to translate a translation key into a string based on the current translation.
 *
 * Messages are {@link https://unicode-org.github.io/icu/userguide/format_parse/messages/ | ICU
 * MessageFormat}, so a message can pluralise or select on the values you pass it. Unknown keys are
 * returned as-is.
 *
 * @example
 *
 * ```ts
 * const msg = useTranslation()
 * const label = msg('style-panel.styles')
 * const selected = msg('a11y.multiple-shapes', { num: 5 })
 * ```
 *
 * @public
 */
export function useTranslation() {
	const translation = React.useContext(TranslationsContext)

	React.useEffect(() => {
		if (!translation?.messages) {
			warnOnce(
				'No translation messages found, falling back to default translation. Wrap your app in <TldrawUiContextProvider>, or in both <AssetUrlsProvider> and <TldrawUiTranslationProvider>, to provide translations.'
			)
		}
	}, [translation?.messages])

	// Not `useIntl()`: that throws outside a provider, where this hook still has to work.
	const providedIntl = React.useContext(IntlContext)

	// `TranslationsContext` on its own has always been enough to translate — tests and hand-rolled
	// setups provide it without the rest. Keep that working by formatting against its messages when
	// there's no `IntlProvider` above us, rather than silently falling back to English.
	const standaloneIntl = React.useMemo(
		() =>
			providedIntl
				? null
				: createIntl(
						{
							locale: translation?.locale ?? 'en',
							defaultLocale: 'en',
							messages: translation?.messages ?? DEFAULT_TRANSLATION,
							onError: onTranslationError,
						},
						intlCache
					),
		[providedIntl, translation?.locale, translation?.messages]
	)
	const intl = providedIntl ?? standaloneIntl!

	return React.useCallback(
		function msg(
			id?: Exclude<string, TLUiTranslationKey> | string,
			values?: TLUiTranslationValues
		): string {
			// `formatMessage` needs an id. Callers pass optional labels straight through, so keep the
			// nullish passthrough this has always had rather than substituting an empty string.
			if (!id) return id as string
			// A bare key carries no default message, by design: this is the path for labels that
			// arrive as data and for an app's own keys. Co-located messages use `F`/`useMsg`.
			// eslint-disable-next-line tldraw/enforce-default-message
			return intl.formatMessage({ id }, values)
		},
		[intl]
	)
}

/**
 * Returns the current text direction ('ltr' or 'rtl') based on the current translation.
 *
 * @public
 */
export function useDirection() {
	const translation = useMaybeCurrentTranslation()
	return translation?.dir ?? 'ltr'
}

export function untranslated(string: string) {
	return string as TLUiTranslationKey
}
