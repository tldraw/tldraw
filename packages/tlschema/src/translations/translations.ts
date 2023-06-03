import { LANGUAGES } from './languages'

/** @public */
export { LANGUAGES }

/** @public */
export type TLLanguage = (typeof LANGUAGES)[number]
// {
// 	readonly locale: string
// 	readonly label: string
// }

/** @public */
export function getDefaultTranslationLocale(): TLLanguage['locale'] {
	const locales = typeof window !== 'undefined' ? window.navigator.languages ?? ['en'] : ['en']
	return _getDefaultTranslationLocale(locales)
}

/** @internal */
export function _getDefaultTranslationLocale(locales: readonly string[]): TLLanguage['locale'] {
	for (const locale of locales) {
		const supportedLocale = getSupportedLocale(locale)
		if (supportedLocale) {
			return supportedLocale
		}
	}
	return 'en'
}

/** @public */
const DEFAULT_LOCALE_REGIONS: { [locale: string]: TLLanguage['locale'] } = {
	zh: 'zh-cn',
	pt: 'pt-br',
	ko: 'ko-kr',
	hi: 'hi-in',
}

/** @public */
function getSupportedLocale(locale: string): TLLanguage['locale'] | null {
	// If we have an exact match, return it!
	// (e.g. if the user has 'fr' and we have 'fr')
	// (or if the user has 'pt-BR' and we have 'pt-br')
	const exactMatch = LANGUAGES.find((t) => t.locale === locale.toLowerCase())
	if (exactMatch) {
		return exactMatch.locale
	}

	// Otherwise, we need to be more flexible...
	const [language, region] = locale.split(/[-_]/).map((s) => s.toLowerCase())

	// If the user's language has a region...
	// let's try to find non-region-specific locale for them
	// (e.g. if they have 'fr-CA' but we only have 'fr')
	if (region) {
		const languageMatch = LANGUAGES.find((t) => t.locale === language)
		if (languageMatch) {
			return languageMatch.locale
		}
	}

	// If the user's language doesn't have a region...
	// let's try to find a region-specific locale for them
	// (e.g. if they have 'pt' but we only have 'pt-pt' or 'pt-br')
	//
	// In this case, we choose the hard-coded default region for that language
	if (language in DEFAULT_LOCALE_REGIONS) {
		return DEFAULT_LOCALE_REGIONS[language]
	}

	// Oh no! We don't have a translation for this language!
	// Let's give up...
	return null
}
