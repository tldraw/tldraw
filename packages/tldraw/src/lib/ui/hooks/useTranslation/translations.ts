import { LANGUAGES } from '@tldraw/editor'
import { TLUiAssetUrls } from '../../assetUrls'
import { TLUiTranslationKey } from './TLUiTranslationKey'
import { DEFAULT_TRANSLATION } from './defaultTranslation'

// The default language (english) must have a value for every message.
// Other languages may have missing messages. If the application finds
// a missing message for the current language, it will use the english
// translation instead.

/* ----------------- (do not change) ---------------- */

export const RTL_LANGUAGES = new Set(['ar', 'fa', 'he', 'ur', 'ku'])

/** @public */
export interface TLUiTranslation {
	readonly locale: string
	readonly label: string
	readonly messages: Record<TLUiTranslationKey, string>
	readonly dir: 'rtl' | 'ltr'
}

const EN_TRANSLATION: TLUiTranslation = {
	locale: 'en',
	label: 'English',
	messages: DEFAULT_TRANSLATION as TLUiTranslation['messages'],
	dir: 'ltr',
}

/** @internal */
export async function fetchTranslation(
	locale: TLUiTranslation['locale'],
	assetUrls: TLUiAssetUrls
): Promise<TLUiTranslation> {
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
	const messages: TLUiTranslation['messages'] = await res.json()

	if (!messages) {
		console.warn(`No messages found for locale ${locale}`)
		return EN_TRANSLATION
	}

	const missing: string[] = []

	for (const key in EN_TRANSLATION.messages) {
		if (!messages[key as TLUiTranslationKey]) {
			missing.push(key)
		}
	}

	if (missing.length > 0 && process.env.NODE_ENV === 'development') {
		console.warn(`Language ${locale}: missing messages for keys:\n${missing.join('\n')}`)
	}

	return {
		locale,
		label: language.label,
		dir: RTL_LANGUAGES.has(language.locale) ? 'rtl' : 'ltr',
		messages: { ...EN_TRANSLATION.messages, ...messages },
	}
}
