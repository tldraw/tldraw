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
 * A message as it's written. The id is optional because a bundler plugin may supply it:
 * `@formatjs/unplugin` with an `idInterpolationPattern` derives one from the message's own text,
 * which is how tldraw.com does it. Everywhere downstream takes a {@link TLI18nMessage}, whose id
 * is required, because {@link defineMessages} fills one in.
 *
 * @public
 */
export type TLI18nMessageInput = Omit<TLI18nMessage, 'id'> & { id?: string }

/**
 * Declares messages so the extractor can find them. The value is in naming the call, which
 * `formatjs extract` matches by name wherever it was imported from.
 *
 * Write the id yourself, as the SDK's own messages do — an app overrides by id, so an id has to
 * survive a reworded English string. Leave it out only where a bundler plugin injects one. Where
 * no plugin ran either, which in practice means a test, the English stands in as the id: it
 * matches nothing in any catalogue, so the message renders as that English. A message that
 * reaches a real build with no id is caught by `pnpm i18n-extract --check`, which sees the
 * content hash the extractor gave it as a key nobody declared.
 *
 * The type parameter is `const` so each written `id` keeps its literal type. That's what lets a
 * declared id be passed where a `TLUiTranslationKey` is expected — a menu item's `label`, say —
 * instead of widening to `string` and needing a cast.
 *
 * For a message rendered as an element, write it inline on the `<F>` instead — the extractor
 * reads those props directly, and the text then sits where it's read. This is for the messages
 * that can't be elements: a label the UI takes as data, and anything going through `useMsg`.
 *
 * @example
 *
 * ```ts
 * const messages = defineMessages({
 * 	copy: { id: 'action.copy', defaultMessage: 'Copy' },
 * })
 * ```
 *
 * @public
 */
export function defineMessages<const Messages extends Record<string, TLI18nMessageInput>>(
	msgs: Messages
): { [K in keyof Messages]: Messages[K] & TLI18nMessage } {
	const withIds = {} as { [K in keyof Messages]: Messages[K] & TLI18nMessage }
	for (const key in msgs) {
		const message = msgs[key]
		withIds[key] = (
			message.id ? message : { ...message, id: message.defaultMessage }
		) as Messages[typeof key] & TLI18nMessage
	}
	return withIds
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
