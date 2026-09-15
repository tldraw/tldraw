import { IntlErrorCode, type OnErrorFn, createIntl, createIntlCache } from '@formatjs/intl'
import { warnOnce } from '@tldraw/editor'
import * as React from 'react'
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
			{children}
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

// One cache for every intl instance we create, as formatjs recommends, so that repeated
// provider mounts don't leak a formatter cache each.
const intlCache = createIntlCache()

// Returning the key verbatim for an unknown id is documented behaviour: apps pass their own keys
// and plain text through `msg()`. Only surface errors that mean a message is actually malformed.
const onTranslationError: OnErrorFn = (error) => {
	if (error.code === IntlErrorCode.MISSING_TRANSLATION) return
	if (process.env.NODE_ENV !== 'production') console.error(error)
}

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
	const messages = translation?.messages ?? DEFAULT_TRANSLATION

	React.useEffect(() => {
		if (!translation?.messages) {
			warnOnce(
				'No translation messages found, falling back to default translation. Wrap your app in <TldrawUiContextProvider>, or in both <AssetUrlsProvider> and <TldrawUiTranslationProvider>, to provide translations.'
			)
		}
	}, [translation?.messages])

	const intl = React.useMemo(
		() =>
			createIntl(
				{
					locale: translation?.locale ?? 'en',
					defaultLocale: 'en',
					messages,
					onError: onTranslationError,
				},
				intlCache
			),
		[translation?.locale, messages]
	)

	return React.useCallback(
		function msg(
			id?: Exclude<string, TLUiTranslationKey> | string,
			values?: TLUiTranslationValues
		): string {
			// `formatMessage` needs an id. Callers pass optional labels straight through, so keep the
			// nullish passthrough this has always had rather than substituting an empty string.
			if (!id) return id as string
			// No `defaultMessage`: the SDK's catalog is authored, not extracted, so the English text
			// lives only in main.json. Inlining it here would be a second copy free to drift.
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
