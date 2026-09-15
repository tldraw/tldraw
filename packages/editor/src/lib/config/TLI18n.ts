/**
 * Values substituted into a message's ICU placeholders.
 *
 * @public
 */
export type TLI18nValues = Record<
	string,
	string | number | bigint | boolean | Date | null | undefined
>

/**
 * The editor's view of the host app's translations. Lets code with no access to React context —
 * a {@link ShapeUtil}, say — translate a string in the user's locale.
 *
 * @public
 */
export interface TLI18n {
	locale: string
	dir: 'ltr' | 'rtl'
	/**
	 * Translate `key` in the current locale, substituting `values` into its ICU placeholders.
	 * Unknown keys come back as-is, so an app can pass its own keys or plain text.
	 */
	translate(key: string, values?: TLI18nValues): string
}

/**
 * Supplies a {@link TLI18n}. Called on each use rather than held as a value, so the editor reads
 * the current locale instead of pinning whichever one was active when it was constructed.
 *
 * @public
 */
export type TLI18nAdapter = () => TLI18n

/**
 * The i18n used when the host app supplies none: every key translates to itself.
 *
 * @public
 */
export function defaultI18n(): TLI18n {
	return {
		locale: 'en',
		dir: 'ltr',
		translate(key: string) {
			return key
		},
	}
}
