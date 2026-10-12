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
	 * Translate `message` in the current locale, substituting `values` into its ICU placeholders.
	 *
	 * Takes the whole message rather than its id so an implementation can fall back to the English
	 * and still substitute into it. A message absent from the catalog — anything not yet through
	 * Lokalise — would otherwise have to come back as its own source text, placeholders and all.
	 */
	translate(message: TLI18nMessage, values?: TLI18nValues): string
}

/**
 * Supplies a {@link TLI18n}. Called on each use rather than held as a value, so the editor reads
 * the current locale instead of pinning whichever one was active when it was constructed.
 *
 * @public
 */
export type TLI18nAdapter = () => TLI18n

/**
 * The i18n used when the host app supplies none: every message comes back as its own English.
 *
 * Placeholders are left as they are, because formatting ICU needs a formatter and this package
 * deliberately has none — it is the floor for an editor running with no translations at all.
 *
 * @public
 */
export function defaultI18n(): TLI18n {
	return {
		locale: 'en',
		dir: 'ltr',
		translate(message: TLI18nMessage) {
			return message.defaultMessage
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
 * Declares messages so the extractor can find them, next to the UI that shows them — the English
 * then lives with the code rather than in a catalog edited by hand. Call it by this name:
 * `formatjs extract` matches the call by name, wherever it was imported from, so a wrapper under
 * another name extracts nothing.
 *
 * Write the id yourself, as the SDK's own messages do — an app overrides by id, so an id has to
 * survive a reworded English string. Leave it out only where a bundler plugin injects one; with no
 * plugin either the English stands in, so the message still renders as itself. An id missing from
 * a real build is caught by `pnpm i18n-extract --check`.
 *
 * The type parameter is `const` so each written `id` keeps its literal type, which is what lets a
 * declared id go where a `TLUiTranslationKey` is expected — a menu item's `label`, say — instead
 * of widening to `string` and needing a cast.
 *
 * For a message rendered as an element, write it inline on the `<F>` instead; the extractor reads
 * those props directly. This is for the ones that can't be: a label the UI takes as data, and
 * anything going through `useMsg`.
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
 * With no i18n at all the English is returned unformatted, for the reason given on
 * {@link defaultI18n}. Every other case goes through the adapter, which does substitute.
 *
 * @public
 */
export function translateMessage(
	i18n: TLI18n | null | undefined,
	message: TLI18nMessage,
	values?: TLI18nValues
): string {
	if (!i18n) return message.defaultMessage
	return i18n.translate(message, values)
}
