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

/**
 * One translatable message: a stable `id` naming it in the catalog, and the English it falls back
 * to. `defaultMessage` is required, because this package's strings have to read correctly with no
 * translations loaded at all — `@tldraw/editor` can be used without any of tldraw's UI.
 *
 * @public
 */
export interface TLI18nMessage {
	id: string
	defaultMessage: string
	description?: string
}

/**
 * Declares messages so the extractor can find them. Returns them unchanged; the value is in
 * naming the call, which is what `formatjs extract` looks for.
 *
 * @public
 */
export function defineMessages<Messages extends Record<string, TLI18nMessage>>(
	msgs: Messages
): Messages {
	if (process.env.NODE_ENV !== 'production') {
		for (const key in msgs) {
			if (!msgs[key].id) throw new Error(`defineMessages: "${key}" is missing an id.`)
		}
	}
	return msgs
}

/**
 * Translates `message` through an editor's i18n, falling back to its English.
 *
 * Takes the editor's i18n rather than reading a context, so it works in the places this package
 * has to keep working: a `ShapeUtil` with no hooks available, or an error fallback rendered
 * outside the editor it's reporting on.
 *
 * @public
 */
export function translateMessage(
	i18n: TLI18n | null | undefined,
	message: TLI18nMessage,
	values?: TLI18nValues
): string {
	if (!i18n) return message.defaultMessage
	const translated = i18n.translate(message.id, values)
	// `translate` hands an unknown key back unchanged, which is what happens both when no
	// translations are loaded and before a newly added message has been through Lokalise. Either
	// way the id is not something to show someone.
	return translated === message.id ? message.defaultMessage : translated
}
