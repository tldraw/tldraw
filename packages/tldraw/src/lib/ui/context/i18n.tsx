import { createIntl, defineMessages, IntlShape, MessageDescriptor } from '@formatjs/intl'
import { TLI18n, TLI18nAdapter } from '@tldraw/editor'
import { useCallback, useMemo, useRef } from 'react'
import {
	TLUiTranslationContextType,
	useCurrentTranslation,
} from '../hooks/useTranslation/useTranslation'

export { defineMessages }

/**
 * Creates a TLI18nAdapter backed by the current tldraw UI translation context and formatjs intl.
 *
 * When `translate()` receives a `MessageDescriptor` object (from `defineMessages`), it uses
 * `intl.formatMessage()` to resolve the ICU message. When it receives a plain string key it
 * falls back to the legacy translation lookup.
 *
 * @public
 */
export function useTldrawI18n(): TLI18nAdapter {
	const translation = useCurrentTranslation()

	// Store translation in a ref so the adapter function always reads the latest value
	// without needing to be recreated (which would cause editor re-initialization).
	const translationRef = useRef<TLUiTranslationContextType>(translation)
	translationRef.current = translation

	const intlRef = useRef<IntlShape<string> | null>(null)
	const localeRef = useRef<string>('')

	// Only recreate intl when locale changes
	if (localeRef.current !== translation.locale) {
		localeRef.current = translation.locale
		intlRef.current = createIntl({
			locale: translation.locale,
			messages: {},
		})
	}

	const i18n: TLI18n = useMemo(
		() => ({
			locale: translation.locale,
			dir: translation.dir,
			translate(key: string | MessageDescriptor, ...args: any[]) {
				// If we're given a MessageDescriptor (from defineMessages), use formatjs
				if (typeof key === 'object' && key !== null && 'id' in key) {
					return intlRef.current!.formatMessage(key as MessageDescriptor, args[0])
				}
				// Otherwise fall back to the legacy translation lookup
				const t = translationRef.current
				return t.messages[key as keyof typeof t.messages] ?? key
			},
		}),
		// Only recreate when locale or dir change
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[translation.locale, translation.dir]
	)

	return useCallback(() => i18n, [i18n])
}
