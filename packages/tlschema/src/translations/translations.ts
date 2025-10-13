import { LANGUAGES } from './languages'

/** @public */
export { LANGUAGES }

/**
 * A language definition object representing a supported localization in tldraw.
 *
 * Derived from the LANGUAGES array, this type represents a single language entry
 * containing a locale identifier and human-readable label. The locale follows
 * BCP 47 standards (e.g., 'en', 'fr', 'zh-CN') and the label is in the native language.
 *
 * @example
 * ```ts
 * import { TLLanguage } from '@tldraw/tlschema'
 *
 * // Using TLLanguage type
 * const currentLanguage: TLLanguage = { locale: 'fr', label: 'Français' }
 *
 * // Access locale and label
 * console.log(currentLanguage.locale) // "fr"
 * console.log(currentLanguage.label)  // "Français"
 * ```
 *
 * @public
 */
export type TLLanguage = (typeof LANGUAGES)[number]

/**
 * Gets the default translation locale based on the user's browser language preferences.
 *
 * This function determines the best matching locale from the user's browser language
 * settings, falling back to English if no suitable match is found. It works in both
 * browser and server-side environments, defaulting to English on the server.
 *
 * The function prioritizes exact matches first, then falls back to language-only
 * matches, and finally uses predefined regional defaults for languages like Chinese,
 * Portuguese, Korean, and Hindi.
 *
 * @returns The locale identifier (e.g., 'en', 'fr', 'zh-cn') that best matches the user's preferences
 *
 * @example
 * ```ts
 * import { getDefaultTranslationLocale } from '@tldraw/tlschema'
 *
 * // Get the user's preferred locale
 * const locale = getDefaultTranslationLocale()
 * console.log(locale) // e.g., "fr" or "en" or "zh-cn"
 *
 * // Use in localization setup
 * const i18n = new I18n({
 *   locale,
 *   // ... other config
 * })
 * ```
 *
 * @example
 * ```ts
 * // Browser with languages: ['fr-CA', 'en-US']
 * const locale = getDefaultTranslationLocale()
 * console.log(locale) // "fr" (if French is supported)
 *
 * // Browser with languages: ['zh']
 * const locale = getDefaultTranslationLocale()
 * console.log(locale) // "zh-cn" (default region for Chinese)
 * ```
 *
 * @public
 */
export function getDefaultTranslationLocale(): TLLanguage['locale'] {
	const locales =
		typeof window !== 'undefined' && window.navigator
			? (window.navigator.languages ?? ['en'])
			: ['en']
	return _getDefaultTranslationLocale(locales)
}

/**
 * Internal function that determines the default translation locale from a list of locale preferences.
 *
 * This function is the core logic for locale resolution, separated from browser-specific code
 * for easier testing and reuse. It iterates through the provided locales in priority order
 * and returns the first supported locale found, or 'en' as the ultimate fallback.
 *
 * @param locales - Array of locale identifiers in preference order (e.g., from navigator.languages)
 * @returns The best matching supported locale identifier
 *
 * @example
 * ```ts
 *
 * // Test locale resolution
 * const locale = _getDefaultTranslationLocale(['fr-CA', 'en-US', 'es'])
 * console.log(locale) // "fr" (if French is supported)
 *
 * // No supported locales
 * const fallback = _getDefaultTranslationLocale(['xx-YY', 'zz-AA'])
 * console.log(fallback) // "en"
 * ```
 *
 * @internal
 */
export function _getDefaultTranslationLocale(locales: readonly string[]): TLLanguage['locale'] {
	for (const locale of locales) {
		const supportedLocale = getSupportedLocale(locale)
		if (supportedLocale) {
			return supportedLocale
		}
	}
	return 'en'
}

/**
 * Default regional variants for languages that have multiple regional versions.
 *
 * When a user's locale contains only a language code (e.g., 'zh', 'pt') but tldraw
 * only supports region-specific variants, this mapping determines which regional
 * variant to use as the default. This ensures users get the most appropriate
 * localization even when their preference doesn't specify a region.
 *
 *
 * @example
 * ```ts
 * // User has locale preference "zh" but we only support "zh-cn" and "zh-tw"
 * const defaultRegion = DEFAULT_LOCALE_REGIONS['zh']
 * console.log(defaultRegion) // "zh-cn"
 *
 * // User has locale preference "pt" but we support "pt-br" and "pt-pt"
 * const defaultRegion = DEFAULT_LOCALE_REGIONS['pt']
 * console.log(defaultRegion) // "pt-br"
 * ```
 *
 * @public
 */
const DEFAULT_LOCALE_REGIONS: { [locale: string]: TLLanguage['locale'] } = {
	zh: 'zh-cn',
	pt: 'pt-br',
	ko: 'ko-kr',
	hi: 'hi-in',
}

/**
 * Finds a supported locale that matches the given locale identifier.
 *
 * This function implements a flexible locale matching algorithm that tries multiple
 * strategies to find the best available translation:
 *
 * 1. **Exact match**: Looks for an exact locale match (case-insensitive)
 * 2. **Language-only match**: If the input has a region, tries matching just the language
 * 3. **Default region**: If the input lacks a region, uses the default region for that language
 * 4. **No match**: Returns null if no suitable locale is found
 *
 * @param locale - The locale identifier to match (e.g., 'fr-CA', 'pt', 'zh-TW')
 * @returns The matching supported locale identifier, or null if no match is found
 *
 * @example
 * ```ts
 * // Exact matches
 * getSupportedLocale('fr') // "fr" (if supported)
 * getSupportedLocale('PT-BR') // "pt-br" (case insensitive)
 *
 * // Language-only fallback
 * getSupportedLocale('fr-CA') // "fr" (if we only support generic French)
 *
 * // Default region assignment
 * getSupportedLocale('zh') // "zh-cn" (default Chinese region)
 *
 * // No match
 * getSupportedLocale('xyz') // null
 * ```
 *
 * @example
 * ```ts
 * // Usage in locale resolution
 * const userLocales = ['es-MX', 'en-US']
 * for (const userLocale of userLocales) {
 *   const supported = getSupportedLocale(userLocale)
 *   if (supported) {
 *     console.log(`Using locale: ${supported}`)
 *     break
 *   }
 * }
 * ```
 *
 * @public
 */
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
