import { TLI18n, TLI18nAdapter, TLI18nMessage, TLI18nMessageInput } from '@tldraw/editor'
import { ReactNode, useCallback, useRef } from 'react'
import { FormattedMessage, useIntl } from 'react-intl'
import {
	TLUiTranslationValues,
	useCurrentTranslation,
	useTranslation,
} from '../hooks/useTranslation/useTranslation'

/**
 * Values for a message rendered as an element. Alongside the primitives a string message takes, a
 * value may be an element, and a function may be given for a tag that appears in the message, which
 * receives the text that tag encloses. Either way the markup stays out of the string, so a
 * translator gets one whole sentence to reorder rather than fragments that can only be concatenated.
 *
 * @example
 *
 * ```tsx
 * <F
 * 	defaultMessage="<who>{name}</who> joined. {help}"
 * 	id="example.joined"
 * 	values={{
 * 		name: 'Ada',
 * 		who: (chunks) => <strong>{chunks}</strong>,
 * 		help: <a href="/help">Need help?</a>,
 * 	}}
 * />
 * ```
 *
 * @public
 */
export type TLUiMessageValues = Record<
	string,
	TLUiTranslationValues[string] | ReactNode | ((chunks: ReactNode) => ReactNode)
>

/** @public */
export interface TLUiMessageProps extends TLI18nMessageInput {
	values?: TLUiMessageValues
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
export function useMsg(message: TLI18nMessage, values?: TLUiTranslationValues): string {
	const intl = useIntl()
	return intl.formatMessage(message, values)
}

/**
 * Renders a translated message. Use this wherever the message is text in the document; where a
 * string is needed instead, use {@link useMsg}.
 *
 * The `id` is optional, so a message whose id a bundler plugin injects can be rendered from source
 * that carries none. The output is wrapped in a `<span className="i18n-msg">`, which lets a tool
 * tell text that came through here from text that never did.
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
	return (
		// The span marks text that came through here, so a tool can tell it from text that never
		// did — which is how tldraw.com's language-debug overlay finds untranslated strings. An
		// inline element, so it doesn't disturb the layout around it.
		<span className="i18n-msg">
			{isPseudoLocale(intl.locale) ? (
				intl.locale === 'xx-AE' ? (
					makeAccented(descriptor.defaultMessage)
				) : (
					makeLong(descriptor.defaultMessage)
				)
			) : (
				// The rule can't see a spread; `F`'s own callers are what it needs to check.
				// eslint-disable-next-line tldraw/enforce-default-message
				<FormattedMessage {...descriptor} values={values} />
			)}
		</span>
	)
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
