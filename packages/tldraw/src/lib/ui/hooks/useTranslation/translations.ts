import { LANGUAGES, fetch } from '@tldraw/editor'
import { TLUiAssetUrls } from '../../assetUrls'
import { TLUiTranslationKey } from './TLUiTranslationKey'

// English isn't fetched: it's the `defaultMessage` of every declared message, which
// `TldrawUiTranslationProvider` layers underneath whatever this returns. Other languages may
// have missing messages, and fall back to that English.

/* ----------------- (do not change) ---------------- */

/** @public */
export const RTL_LANGUAGES = new Set(['ar', 'fa', 'he', 'ur', 'ku'])

/** @public */
export interface TLUiTranslation {
	readonly locale: string
	readonly label: string
	readonly messages: Record<TLUiTranslationKey, string>
	readonly dir: 'rtl' | 'ltr'
}

/** @internal */
export const EN_TRANSLATION: TLUiTranslation = {
	locale: 'en',
	label: 'English',
	messages: {} as TLUiTranslation['messages'],
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

	if (process.env.NODE_ENV === 'development') {
		const main: Record<string, string> = await mainRes.json()
		const missing = Object.keys(main).filter((key) => !messages[key as TLUiTranslationKey])
		if (missing.length > 0) {
			console.warn(`Language ${locale}: missing messages for keys:\n${missing.join('\n')}`)
		}
	}

	return {
		locale,
		label: language.label,
		dir: RTL_LANGUAGES.has(language.locale) ? 'rtl' : 'ltr',
		messages,
	}
}
