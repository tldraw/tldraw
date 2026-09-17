import { TLI18n, TLI18nAdapter } from '@tldraw/editor'
import { useCallback, useRef } from 'react'
import { FormattedMessage, defineMessages as originalDefineMessages, useIntl } from 'react-intl'
import {
	TLUiTranslationValues,
	useCurrentTranslation,
	useTranslation,
} from '../hooks/useTranslation/useTranslation'

/**
 * One translatable message: a stable `id` naming it in the catalog, and the English text it
 * defaults to. Declared through {@link defineMessages}.
 *
 * Deliberately tldraw's own type rather than react-intl's `MessageDescriptor`: which library
 * formats the message shouldn't be part of the SDK's public contract, and here `defaultMessage`
 * is required — a descriptor without one is invisible to the extractor.
 *
 * @public
 */
export interface TLUiMessageDescriptor {
	id: string
	defaultMessage: string
	description?: string
}

/** @public */
export interface TLUiMessageProps extends TLUiMessageDescriptor {
	values?: TLUiTranslationValues
}

/**
 * Locales that aren't languages: they transform the English text instead of translating it, to
 * surface strings that never made it into the catalog and layouts that can't take a longer one.
 *
 * @public
 */
export const PSEUDO_LOCALES = ['xx-AE', 'xx-LS'] as const

/** @public */
export function isPseudoLocale(locale: string) {
	return (PSEUDO_LOCALES as readonly string[]).includes(locale)
}

const ACCENTS = 'áƃçđéƒǵȟíǰķłɱñóƥɋřšťúṽẃẍýž'

function makeAccented(str: string) {
	return str.replace(/[a-zA-Z]/g, (char) => {
		const isUpper = char === char.toUpperCase()
		const accented = ACCENTS[char.toLowerCase().charCodeAt(0) - 97] || char
		return isUpper ? accented.toUpperCase() : accented
	})
}

function makeLong(str: string) {
	return `${str} loooooooo oo ooooooong`
}

/**
 * Translates a message and returns it as a string, for the places a component can't go: an
 * `aria-label`, a `title`, a `placeholder`, or any non-JSX module.
 *
 * @example
 *
 * ```tsx
 * const messages = defineMessages({
 * 	close: { id: 'ui.close', defaultMessage: 'Close' },
 * })
 * const label = useMsg(messages.close)
 * ```
 *
 * @public
 */
export function useMsg(message: TLUiMessageDescriptor, values?: TLUiTranslationValues): string {
	const intl = useIntl()
	return intl.formatMessage(message, values)
}

/**
 * Renders a translated message. Use this wherever the message is text in the document; where a
 * string is needed instead, use {@link useMsg}.
 *
 * @example
 *
 * ```tsx
 * <F defaultMessage="Close" id="ui.close" />
 * ```
 *
 * @public @react
 */
export function F({ values, ...descriptor }: TLUiMessageProps) {
	const intl = useIntl()
	if (isPseudoLocale(intl.locale)) {
		const text = descriptor.defaultMessage
		return <>{intl.locale === 'xx-AE' ? makeAccented(text) : makeLong(text)}</>
	}
	// The rule can't see a spread; `F`'s own callers are what it needs to check.
	// eslint-disable-next-line tldraw/enforce-default-message
	return <FormattedMessage {...descriptor} values={values} />
}

/**
 * Declares messages for extraction. Every descriptor needs an explicit `id`: the SDK's ids are
 * stable names an app can override by key, not content hashes that change with the English text.
 *
 * This call is what the extractor reads, so declaring a message here is what puts it in the
 * catalog — whichever way it's consumed afterwards. That covers the labels the UI takes as data
 * rather than as elements (an action's `label`, a menu item's, an input's): declare the message
 * and pass `messages.x.id`, and the string is still extracted and still can't drift from its id.
 *
 * @public
 */
export function defineMessages<Messages extends Record<string, TLUiMessageDescriptor>>(
	msgs: Messages
): Messages {
	if (process.env.NODE_ENV !== 'production') {
		for (const key in msgs) {
			if (!msgs[key].id) {
				throw new Error(`defineMessages: "${key}" is missing an id.`)
			}
		}
	}
	return originalDefineMessages(msgs)
}

/**
 * Builds the `TLI18nAdapter` the editor hands to code that has no access to React context,
 * such as a `ShapeUtil`. `<Tldraw />` wires this up for you; call it yourself only when composing
 * `<TldrawEditor />` by hand, and from inside a `<TldrawUiTranslationProvider />`.
 *
 * @example
 *
 * ```tsx
 * function MyEditor(props: TldrawEditorProps) {
 * 	const i18n = useTldrawI18n()
 * 	return <TldrawEditor {...props} i18n={i18n} />
 * }
 * ```
 *
 * @public
 */
export function useTldrawI18n(): TLI18nAdapter {
	const translation = useCurrentTranslation()
	const msg = useTranslation()

	// The adapter identity has to stay stable: it's a constructor option, so a new one on every
	// locale change would tear down and rebuild the editor. Reading through a ref keeps the
	// returned function fixed while still resolving against the current translation. Assigned
	// during render, so it is always set before the editor can call the adapter.
	const i18nRef = useRef<TLI18n | null>(null)
	i18nRef.current = {
		locale: translation.locale,
		dir: translation.dir,
		translate: msg,
	}

	return useCallback(() => i18nRef.current!, [])
}
