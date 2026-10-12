/* eslint-disable no-restricted-imports */
import { ComponentPropsWithoutRef } from 'react'
import {
	FormattedMessage,
	IntlConfig,
	IntlShape,
	createIntlCache,
	createIntl as originalCreateIntl,
} from 'react-intl'
import { F as TldrawF, TLI18nMessage, defineMessages as sdkDefineMessages } from 'tldraw'

// Re-export everything and override below what we want to override.
// eslint-disable-next-line
export * from 'react-intl'

// The SDK's, rather than a second copy of them. dotcom and the SDK resolve to one react-intl, so
// these read the `IntlProvider` in TlaRootProviders and translate against dotcom's own messages:
// the catalogue and its Lokalise project stay dotcom's, only the machinery is shared.
//
// `isPseudoLocale` is what used to be `isInternalLocale`, and the accented and lengthened
// transforms it pairs with now live inside the SDK's `F`.
export { isPseudoLocale, useMsg } from 'tldraw'

/**
 * A message as a call site here writes it, which is without an id: `@formatjs/unplugin` injects
 * one at build from the message's content.
 */
type AppMessage = Omit<TLI18nMessage, 'id'> & { id?: string }

/**
 * Declares messages for extraction, and is where the injected id is asserted — so everything
 * downstream takes a `TLI18nMessage` and needs no cast of its own. Throws if an id is still
 * missing by the time this runs, which means the plugin didn't.
 */
export function defineMessages<K extends string>(
	msgs: Record<K, AppMessage>
): Record<K, TLI18nMessage> {
	return sdkDefineMessages(msgs as Record<K, TLI18nMessage>)
}

/**
 * A translated message, wrapped so the language-debug overlay can find it.
 *
 * Delegates to the SDK's `F`, which handles the pseudo-locales. The span is the part that can't
 * move there: `.tla-lang-highlight-missing` uses it to tell text that came through here apart from
 * text that never did.
 *
 * The cast is for the id. `@formatjs/unplugin` injects one at build from the message's content, so
 * a call site here writes none and the SDK's required `id` isn't satisfied in source — it is by the
 * time anything runs.
 */
export function F(props: ComponentPropsWithoutRef<typeof FormattedMessage>) {
	return (
		<span className="i18n-msg">
			<TldrawF {...(props as ComponentPropsWithoutRef<typeof TldrawF>)} />
		</span>
	)
}

// This is optional but highly recommended since it prevents memory leaks.
// See: https://formatjs.github.io/docs/react-intl/api/#createintl
const cache = createIntlCache()
let presetIntl: IntlShape | null = null
let didSetupCreateIntl = false
export function setupCreateIntl({ defaultLocale, locale, messages }: IntlConfig) {
	presetIntl = originalCreateIntl(
		{
			defaultLocale,
			locale,
			messages,
		},
		cache
	)

	didSetupCreateIntl = true
}

// createIntl is used in non-React locations.
export function createIntl(options?: IntlShape) {
	if (options) {
		return originalCreateIntl(options)
	} else {
		if (!didSetupCreateIntl) {
			throw new Error('Need to run setupCreateIntl to use createIntl without options.')
		}
		return presetIntl
	}
}
