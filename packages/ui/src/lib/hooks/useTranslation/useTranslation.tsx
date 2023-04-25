import { useApp } from '@tldraw/editor'
import * as React from 'react'
import { track } from 'signia-react'
import { useAssetUrls } from '../useAssetUrls'
import { TLTranslationKey } from './TLTranslationKey'
import { DEFAULT_TRANSLATION } from './defaultTranslation'
import { TLTranslation, getTranslation } from './translations'

/** @public */
export interface TranslationProviderProps {
	children: any
	/**
	 * (optional) A collection of overrides different locales.
	 *
	 * @example
	 *
	 * ```ts
	 * <TranslationProvider overrides={{ en: { 'style-panel.styles': 'Properties' } }} />
	 * ```
	 */
	overrides?: Record<string, Record<string, string>>
}

const TranslationsContext = React.createContext<TLTranslation>({} as TLTranslation)

const useCurrentTranslation = () => React.useContext(TranslationsContext)

/**
 * Provides a translation context to the app.
 *
 * @public
 */
export const TranslationProvider = track(function TranslationProvider({
	overrides,
	children,
}: TranslationProviderProps) {
	const app = useApp()
	const locale = app.userSettings.locale
	const getAssetUrl = useAssetUrls()

	const [currentTranslation, setCurrentTranslation] = React.useState<TLTranslation>(() => {
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
			const localeFullString = locale ?? navigator.language
			const translation = await getTranslation(localeFullString, getAssetUrl)

			if (translation && !isCancelled) {
				if (overrides) {
					// check full string (e.g. 'en-US') and then just the language (e.g. 'en')
					const langOverride =
						overrides[localeFullString.toLowerCase()] ??
						overrides[localeFullString.split(/[-_]/)[0].toLowerCase()]
					setCurrentTranslation({
						...translation,
						messages: { ...translation.messages, ...langOverride },
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
		function msg(id: TLTranslationKey) {
			return translation.messages[id] ?? id
		},
		[translation]
	)
}
