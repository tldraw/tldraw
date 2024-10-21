import * as React from 'react'
import { useAssetUrls } from '../../context/asset-urls'
import { TLUiTranslationKey } from './TLUiTranslationKey'
import { DEFAULT_TRANSLATION } from './defaultTranslation'
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

const TranslationsContext = React.createContext<TLUiTranslationContextType | null>(null)

/** @public */
export function useCurrentTranslation() {
	const translations = React.useContext(TranslationsContext)
	if (!translations) {
		throw new Error('useCurrentTranslation must be used inside of <TldrawUiContextProvider />')
	}
	return translations
}

/**
 * Provides a translation context to the editor.
 *
 * @internal
 */
export function TldrawUiTranslationProvider({
	overrides,
	locale,
	children,
}: TLUiTranslationProviderProps) {
	const getAssetUrl = useAssetUrls()

	const [currentTranslation, setCurrentTranslation] = React.useState<TLUiTranslation>(() => {
		if (overrides && overrides['en']) {
			return {
				locale: 'en',
				label: 'English',
				dir: 'ltr',
				messages: { ...DEFAULT_TRANSLATION, ...overrides['en'] },
			}
		}

		return {
			locale: 'en',
			label: 'English',
			dir: 'ltr',
			messages: DEFAULT_TRANSLATION,
		}
	})

	React.useEffect(() => {
		let isCancelled = false

		async function loadTranslation() {
			const translation = await fetchTranslation(locale, getAssetUrl)

			if (translation && !isCancelled) {
				if (overrides && overrides[locale]) {
					setCurrentTranslation({
						...translation,
						messages: { ...translation.messages, ...overrides[locale] },
					})
				} else {
					setCurrentTranslation(translation)
				}
			}
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
 * Returns a function to translate a translation key into a string based on the current translation.
 *
 * @example
 *
 * ```ts
 * const msg = useTranslation()
 * const label = msg('style-panel.styles')
 * ```
 *
 * @public
 */
export function useTranslation() {
	const translation = useCurrentTranslation()
	return React.useCallback(
		function msg(id?: Exclude<string, TLUiTranslationKey> | string) {
			return translation.messages[id as TLUiTranslationKey] ?? id
		},
		[translation]
	)
}

export function untranslated(string: string) {
	return string as TLUiTranslationKey
}
