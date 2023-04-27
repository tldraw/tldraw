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
export async function fetchTranslation(
	locale: TLTranslationLocale,
	assetUrls: UiAssetUrls
): Promise<TLTranslation> {
	const mainRes = await fetch(assetUrls.translations.en)

	if (!mainRes.ok) {
		console.warn(`No main translations found.`)
		return EN_TRANSLATION
	}

	if (locale === 'en') {
		return EN_TRANSLATION
	}

	const language = LANGUAGES.find((t) => t.locale === locale)

	if (!language) {
		console.warn(`No translation found for locale ${locale}`)
		return EN_TRANSLATION
	}

	const res = await fetch(assetUrls.translations[language.locale])
	const messages: TLTranslationMessages = await res.json()

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
		...language,
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
