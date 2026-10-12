/* eslint-disable no-restricted-imports */
// Every translation in this app goes through the SDK's own i18n. That's the point: tldraw.com is a
// consumer of the SDK, so anything it needed and the SDK lacked belongs in the SDK rather than here.
//
// What's left is re-exports. `react-intl` for the formatters the SDK doesn't wrap, and the SDK for
// the rest. The `no-restricted-imports` rule on `react-intl` keeps call sites pointing at this
// module, so there stays one place to look.

// eslint-disable-next-line
export * from 'react-intl'

// The SDK's, not a second copy of them. dotcom and the SDK resolve to one react-intl, so these read
// the `IntlProvider` in TlaRootProviders and translate against dotcom's own messages: the catalogue
// and its Lokalise project stay dotcom's, only the machinery is shared.
export {
	F,
	// This app's ids are injected at build from each message's content by `@formatjs/unplugin`, so
	// its messages are written without one — hence the generated-id variant rather than
	// `defineMessages`, which requires the hand-written ids the SDK's own messages have.
	defineMessagesWithGeneratedIds as defineMessages,
	isPseudoLocale,
	useMsg,
} from 'tldraw'
