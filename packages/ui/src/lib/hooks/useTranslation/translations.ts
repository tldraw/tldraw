import { UiAssetUrls } from '../../assetUrls'
import { DEFAULT_TRANSLATION } from './defaultTranslation'
import { LANGUAGES } from './languages'
import { TLTranslationKey } from './TLTranslationKey'

// The default language (english) must have a value for every message.
// Other languages may have missing messages. If the application finds
// a missing message for the current language, it will use the english
// translation instead.

/* ----------------- (do not change) ---------------- */

/** @public */
export type TLListedTranslation = {
	readonly locale: string
	readonly label: string
}

/** @public */
export type TLListedTranslations = readonly TLListedTranslation[]

/** @public */
export type TLTranslationMessages = Record<TLTranslationKey, string>

/** @public */
export type TLTranslation = {
	readonly locale: string
	readonly label: string
	readonly messages: TLTranslationMessages
}

/** @public */
export type TLTranslations = TLTranslation[]

/** @public */
export type TLTranslationLocale = TLTranslations[number]['locale']

/** @public */
export const EN_TRANSLATION: TLTranslation = {
	locale: 'en',
	label: 'English',
	messages: DEFAULT_TRANSLATION as TLTranslationMessages,
}

/** @public */
export function getDefaultTranslationLocale(
	locales = window.navigator.languages
): TLTranslationLocale {
	for (const locale of locales) {
		const supportedLocale = getSupportedLocale(locale)
		if (supportedLocale) {
			return supportedLocale
		}
	}
	return 'en'
}

/** @public */
const DEFAULT_LOCALE_REGIONS: { [locale: string]: TLTranslationLocale } = {
	zh: 'zh-cn',
	pt: 'pt-br',
	ko: 'ko-kr',
	hi: 'hi-in',
}

/** @public */
function getSupportedLocale(locale: string): TLTranslationLocale | null {
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

/** @public */
export async function fetchTranslation(
	localeFullString: TLTranslationLocale,
	assetUrls: UiAssetUrls
): Promise<TLTranslation> {
	const mainRes = await fetch(assetUrls.translations.en)

	if (!mainRes.ok) {
		console.warn(`No main translations found.`)
		return EN_TRANSLATION
	}

	if (localeFullString === 'en') {
		return EN_TRANSLATION
	}

	// check full string (e.g. 'en-US') and then just the language (e.g. 'en')
	const language =
		LANGUAGES.find((t) => t.locale === localeFullString.toLowerCase()) ??
		LANGUAGES.find((t) => t.locale === localeFullString.split(/[-_]/)[0].toLowerCase())

	if (!language) {
		console.warn(`No translation found for locale ${localeFullString}`)
		return EN_TRANSLATION
	}

	const res = await fetch(assetUrls.translations[language.locale])
	const messages: TLTranslationMessages = await res.json()

	if (!messages) {
		console.warn(`No messages found for locale ${localeFullString}`)
		return EN_TRANSLATION
	}

	const missing: string[] = []

	for (const key in EN_TRANSLATION) {
		if (!messages[key as TLTranslationKey]) {
			missing.push(key)
		}
	}

	if (missing.length > 0 && process.env.NODE_ENV === 'development') {
		console.warn(`Language ${localeFullString}: missing messages for keys:\n${missing.join('\n')}`)
	}

	return {
		...language,
		messages: { ...EN_TRANSLATION.messages, ...messages },
	}
}

/** @public */
export async function getTranslation(
	localeFullString: TLTranslationLocale,
	assetUrls: UiAssetUrls
): Promise<TLTranslation> {
	return await fetchTranslation(localeFullString, assetUrls)
}
