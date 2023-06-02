import { useEditor } from '@tldraw/editor'
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
	const app = useEditor()
	const locale = app.locale
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
			const translation = await getTranslation(locale, getAssetUrl)

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
		function msg(id: TLTranslationKey) {
			return translation.messages[id] ?? id
		},
		[translation]
	)
}
