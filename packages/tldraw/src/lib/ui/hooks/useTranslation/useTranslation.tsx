import { track, useEditor } from '@tldraw/editor'
import * as React from 'react'
import { useAssetUrls } from '../useAssetUrls'
import { TLUiTranslationKey } from './TLUiTranslationKey'
import { DEFAULT_TRANSLATION } from './defaultTranslation'
import { TLUiTranslation, fetchTranslation } from './translations'

/** @public */
export interface TLUiTranslationProviderProps {
	children: any
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

const TranslationsContext = React.createContext<TLUiTranslationContextType>(
	{} as TLUiTranslationContextType
)

const useCurrentTranslation = () => React.useContext(TranslationsContext)

/**
 * Provides a translation context to the editor.
 *
 * @internal
 */
export const TranslationProvider = track(function TranslationProvider({
	overrides,
	children,
}: TLUiTranslationProviderProps) {
	const editor = useEditor()
	const locale = editor.user.getLocale()
	const getAssetUrl = useAssetUrls()

	const [currentTranslation, setCurrentTranslation] = React.useState<TLUiTranslation>(() => {
		if (overrides && overrides['en']) {
			return {
				locale: 'en',
				label: 'English',
				messages: { ...DEFAULT_TRANSLATION, ...overrides['en'] },
			}
		}

		return {
			locale: 'en',
			label: 'English',
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
})

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
		function msg(id: Exclude<string, TLUiTranslationKey> | string) {
			return translation.messages[id as TLUiTranslationKey] ?? id
		},
		[translation]
	)
}

export function untranslated(string: string) {
	return string as TLUiTranslationKey
}
