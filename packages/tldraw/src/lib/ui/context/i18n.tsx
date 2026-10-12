import { TLI18n, TLI18nAdapter, TLI18nMessageInput } from '@tldraw/editor'
import { ReactNode, useCallback, useRef } from 'react'
import { FormattedMessage, useIntl } from 'react-intl'
import {
	TLUiTranslationValues,
	useCurrentTranslation,
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
 * Renders a translated message. Use this wherever the message is text in the document; where a
 * string is needed instead, translate the message's id through `useTranslation`.
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
	// Format the message before transforming it, rather than reaching for `descriptor`. A build
	// that precompiles messages to AST, as tldraw.com does, leaves `defaultMessage` an array of
	// nodes: accenting it threw `str.replace is not a function` and lengthening it printed
	// "[object Object]". Formatting also substitutes the values, where the raw default message
	// showed its own `{placeholders}`. Values holding an element come back as nodes rather than a
	// string, and there is nothing to transform, so those render untransformed.
	// eslint-disable-next-line tldraw/enforce-default-message
	const pseudo = isPseudoLocale(intl.locale) ? intl.formatMessage(descriptor, values) : null
	return (
		// Inline, so the marker span doesn't disturb the layout around it. Why it's here at all is
		// on `F` above.
		<span className="i18n-msg">
			{typeof pseudo === 'string' ? (
				intl.locale === 'xx-AE' ? (
					makeAccented(pseudo)
				) : (
					makeLong(pseudo)
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
	const intl = useIntl()

	// The adapter identity has to stay stable: it's a constructor option, so a new one on every
	// locale change would tear down and rebuild the editor. Hence the ref — the returned function
	// is fixed, and still reads the current translation.
	const i18nRef = useRef<TLI18n | null>(null)
	i18nRef.current = {
		locale: translation.locale,
		dir: translation.dir,
		// The whole descriptor, so react-intl formats `defaultMessage` itself for an id the
		// catalog doesn't have. Given only the id it returns the id, and the English then had to
		// be substituted in verbatim — which showed a plural message's own ICU source in a toast.
		// eslint-disable-next-line tldraw/enforce-default-message
		translate: (message, values) => intl.formatMessage(message, values),
	}

	return useCallback(() => i18nRef.current!, [])
}
