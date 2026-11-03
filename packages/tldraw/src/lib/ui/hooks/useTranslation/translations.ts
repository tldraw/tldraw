import { LANGUAGES, fetch, getDeclaredMessages } from '@tldraw/editor'
import { TLUiAssetUrlOverrides, TLUiAssetUrls, defaultUiAssetUrls } from '../../assetUrls'
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

// Keyed by URL rather than locale, since an app can point a locale at its own catalog. Without
// this, every `TldrawUiTranslationProvider` mount (each `<Tldraw>`, each remount) showed English
// until it had refetched a catalog that was already loaded.
const pendingTranslations = new Map<string, Promise<TLUiTranslation>>()
const loadedTranslations = new Map<string, TLUiTranslation>()

/** @internal */
export function clearTranslationCache() {
	pendingTranslations.clear()
	loadedTranslations.clear()
}

/**
 * The translation for a locale if it's available without waiting: English, a locale the SDK has no
 * catalog for (which falls back to English), or one that has already been fetched.
 *
 * @internal
 */
export function getLoadedTranslation(
	locale: TLUiTranslation['locale'],
	translationUrls: Partial<TLUiAssetUrls['translations']>
): TLUiTranslation | undefined {
	if (locale === 'en') return EN_TRANSLATION
	const language = LANGUAGES.find((t) => t.locale === locale)
	if (!language) return EN_TRANSLATION
	const url = translationUrls[language.locale]
	return url ? loadedTranslations.get(url) : undefined
}

/**
 * Starts loading the UI translation for a locale, so that the tldraw UI renders in that language
 * from its first frame instead of in English while it fetches. Call it as soon as you know the
 * user's locale, and await it if you'd rather show nothing than briefly show English.
 *
 * Pass the same `assetUrls` you pass to `<Tldraw />`, if any. The promise never rejects: if the
 * catalog fails to load, the UI tries again when it mounts and falls back to English.
 *
 * @example
 *
 * ```ts
 * await preloadTranslation('fr')
 * ```
 *
 * @public
 */
export async function preloadTranslation(
	locale: TLUiTranslation['locale'],
	assetUrls?: TLUiAssetUrlOverrides
): Promise<void> {
	try {
		await fetchTranslation(locale, {
			...defaultUiAssetUrls.translations,
			...assetUrls?.translations,
		})
	} catch {
		// Already forgotten by `fetchTranslation`, so the UI's own attempt retries it.
	}
}

/** @internal */
export function fetchTranslation(
	locale: TLUiTranslation['locale'],
	translationUrls: Partial<TLUiAssetUrls['translations']>
): Promise<TLUiTranslation> {
	if (locale === 'en') {
		return Promise.resolve(EN_TRANSLATION)
	}

	const language = LANGUAGES.find((t) => t.locale === locale)

	if (!language) {
		console.warn(`No translation found for locale ${locale}`)
		return Promise.resolve(EN_TRANSLATION)
	}

	const url = translationUrls[language.locale]
	if (!url) {
		console.warn(`No translation URL for locale ${locale}`)
		return Promise.resolve(EN_TRANSLATION)
	}

	let pending = pendingTranslations.get(url)
	if (!pending) {
		pending = loadTranslation(language, url)
		pendingTranslations.set(url, pending)
		pending.then(
			(translation) => loadedTranslations.set(url, translation),
			// A failed fetch isn't cached, so the next mount retries it.
			() => pendingTranslations.delete(url)
		)
	}
	return pending
}

async function loadTranslation(
	language: (typeof LANGUAGES)[number],
	url: string
): Promise<TLUiTranslation> {
	const { locale } = language
	const res = await fetch(url)
	const messages: TLUiTranslation['messages'] = await res.json()

	if (!messages) {
		console.warn(`No messages found for locale ${locale}`)
		return EN_TRANSLATION
	}

	if (process.env.NODE_ENV === 'development') {
		const missing = Object.keys(getDeclaredMessages()).filter(
			(key) => !messages[key as TLUiTranslationKey]
		)
		if (missing.length > 0) {
			console.warn(`Language ${locale}: missing messages for keys:\n${missing.join('\n')}`)
		}
	}

	return {
		locale,
		label: language.label,
		dir: RTL_LANGUAGES.has(locale) ? 'rtl' : 'ltr',
		messages,
	}
}
