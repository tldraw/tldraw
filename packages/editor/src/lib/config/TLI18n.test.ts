import { describe, expect, it } from 'vitest'
import { TLI18n, defaultI18n, defineMessages, translateMessage } from './TLI18n'

const messages = defineMessages({
	somethingWentWrong: { id: 'error.title', defaultMessage: 'Something went wrong' },
	shapesSelected: {
		id: 'a11y.multiple-shapes',
		defaultMessage: '{num, plural, one {# shape selected} other {# shapes selected}}',
	},
})

function i18nWith(catalog: Record<string, string>): TLI18n {
	return {
		locale: 'en',
		dir: 'ltr',
		// Mirrors the real adapter: an unknown key comes back unchanged.
		translate: (key, values) => {
			const message = catalog[key]
			if (message === undefined) return key
			return message.replace(/\{(\w+)[^}]*\}/g, (_, name) => String(values?.[name] ?? ''))
		},
	}
}

describe('translateMessage', () => {
	it('uses the translation when the catalog has one', () => {
		const i18n = i18nWith({ 'error.title': 'Etwas ist schiefgelaufen' })
		expect(translateMessage(i18n, messages.somethingWentWrong)).toBe('Etwas ist schiefgelaufen')
	})

	// @tldraw/editor is usable with none of tldraw's UI, so there may be no i18n at all.
	it('falls back to the English when there is no i18n', () => {
		expect(translateMessage(null, messages.somethingWentWrong)).toBe('Something went wrong')
		expect(translateMessage(undefined, messages.somethingWentWrong)).toBe('Something went wrong')
	})

	// A message that hasn't been through Lokalise yet is absent from every catalog, and the adapter
	// signals that by handing the key back. Showing the id to someone would be worse than English.
	it('falls back to the English when the catalog has no entry', () => {
		expect(translateMessage(i18nWith({}), messages.somethingWentWrong)).toBe('Something went wrong')
		expect(translateMessage(defaultI18n(), messages.somethingWentWrong)).toBe(
			'Something went wrong'
		)
	})

	it('passes values through to the translation', () => {
		const i18n = i18nWith({ 'a11y.multiple-shapes': '{num} Formen ausgewählt' })
		expect(translateMessage(i18n, messages.shapesSelected, { num: 3 })).toBe('3 Formen ausgewählt')
	})
})

describe('defineMessages', () => {
	it('returns the messages unchanged', () => {
		const declared = { a: { id: 'x', defaultMessage: 'X' } }
		expect(defineMessages(declared)).toEqual(declared)
	})
})
