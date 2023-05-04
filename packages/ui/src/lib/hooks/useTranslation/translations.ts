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

async function fetchTranslationMessages(
	language: (typeof LANGUAGES)[number],
	assetUrls: UiAssetUrls
): Promise<TLTranslationMessages> {
	const assetUrl = assetUrls.translations[language.locale]

	// if the asset URL is actually a URL, fetch it
	if (typeof assetUrl === 'string') {
		const response = await fetch(assetUrl)
		return await response.json()
	}

	// otherwise, assume it's a json object and return it directly.
	return assetUrl
}

/** @public */
export async function fetchTranslation(
	locale: TLTranslationLocale,
	assetUrls: UiAssetUrls
): Promise<TLTranslation> {
	if (locale === 'en') {
		return EN_TRANSLATION
	}

	const language = LANGUAGES.find((t) => t.locale === locale)

	if (!language) {
		console.warn(`No translation found for locale ${locale}`)
		return EN_TRANSLATION
	}

	const messages = await fetchTranslationMessages(language, assetUrls)

	if (!messages) {
		console.warn(`No messages found for locale ${locale}`)
		return EN_TRANSLATION
	}

	const missing: string[] = []

	for (const key in EN_TRANSLATION) {
		if (!messages[key as TLTranslationKey]) {
			missing.push(key)
		}
	}

	if (missing.length > 0 && process.env.NODE_ENV === 'development') {
		console.warn(`Language ${locale}: missing messages for keys:\n${missing.join('\n')}`)
	}

	return {
		locale,
		label: language.label,
		messages: { ...EN_TRANSLATION.messages, ...messages },
	}
}

/** @public */
export async function getTranslation(
	locale: TLTranslationLocale,
	assetUrls: UiAssetUrls
): Promise<TLTranslation> {
	return await fetchTranslation(locale, assetUrls)
}
