import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { checkMessage, validateCatalogs, validateEntries } from './i18nValidate'

const COUNT = '{count, plural, one {# shape} other {# shapes}}'

describe('checkMessage', () => {
	it('accepts a faithful translation', () => {
		expect(checkMessage('fr', 'Move to {page}', 'Déplacer vers {page}')).toEqual([])
		expect(checkMessage('fr', COUNT, '{count, plural, one {# forme} other {# formes}}')).toEqual([])
	})

	it('rejects an empty translation and broken ICU', () => {
		expect(checkMessage('fr', 'Copy', ' ')).toEqual(['empty translation'])
		expect(checkMessage('fr', '{page}', '{page')).toEqual([expect.stringMatching(/does not parse/)])
	})

	// The failures from #11192, where Google translated the ICU syntax itself.
	it('rejects a translated plural argument', () => {
		expect(checkMessage('de', COUNT, '{andere, plural, one {# Form} other {# Formen}}')).toEqual([
			'unknown argument {andere} (renamed or translated?)',
			'missing argument {count}',
		])
	})

	it('rejects translated plural keywords', () => {
		expect(checkMessage('de', COUNT, '{count, plural, ein {# Form} other {# Formen}}')).toEqual([
			'plural {count} has "ein", which is not a plural category',
			'plural {count} is missing the "one" form',
		])
	})

	it('rejects Lokalise and printf placeholders', () => {
		expect(checkMessage('ca', 'Moved to {page}', 'Mogut a [%1$s:pàgina]')).toEqual([
			'missing argument {page}',
			'non-ICU placeholder [%1$s:pàgina]',
		])
		expect(checkMessage('fr', '{name} joined', '%s a rejoint')).toEqual([
			'missing argument {name}',
			'non-ICU placeholder %s',
		])
	})

	it('rejects a placeholder used as a different kind', () => {
		expect(checkMessage('fr', '{n, number} items', '{n} éléments')).toEqual([
			'{n} is used as argument, English uses it as number',
		])
	})

	it('requires the plural forms the locale needs', () => {
		expect(
			checkMessage('pl', COUNT, '{count, plural, one {# kształt} other {# kształtu}}')
		).toEqual([
			'plural {count} is missing the "few" form',
			'plural {count} is missing the "many" form',
		])
		expect(
			checkMessage(
				'ar',
				COUNT,
				'{count, plural, one {# شكل} few {# أشكال} many {# شكلًا} other {# شكل}}'
			)
		).toEqual([
			'plural {count} is missing the "zero" form',
			'plural {count} is missing the "two" form',
		])
	})

	it("doesn't require a category only very large numbers select", () => {
		// French has `many` only for numbers like 1,000,000.
		expect(checkMessage('fr', COUNT, '{count, plural, one {# forme} other {# formes}}')).toEqual([])
	})

	it('warns about a category the locale never selects', () => {
		const warnings: string[] = []
		expect(
			checkMessage('zh-cn', COUNT, '{count, plural, one {# 个形状} other {# 个形状}}', (w) =>
				warnings.push(w)
			)
		).toEqual([])
		expect(warnings).toEqual(['plural {count} has "one", which zh-cn never selects'])
	})

	it('lets an exact-values English plural keep its shape', () => {
		const english =
			'{count, plural, =1 {{a} reacted} =2 {{a} and {b} reacted} other {{a}, {b} and others reacted}}'
		const polish =
			'{count, plural, =1 {{a} zareagował} =2 {{a} i {b} zareagowali} other {{a}, {b} i inni zareagowali}}'
		expect(checkMessage('pl', english, polish)).toEqual([])
	})

	it('requires select options to match English exactly', () => {
		const english = '{kind, select, file {File} folder {Folder} other {Item}}'
		expect(
			checkMessage('de', english, '{kind, select, datei {Datei} folder {Ordner} other {Element}}')
		).toEqual([
			'select {kind} has unknown option "datei"',
			'select {kind} is missing option "file"',
		])
	})

	it('accepts {count} in place of # and a plural dropped or added for the locale', () => {
		expect(
			checkMessage('fr', COUNT, '{count, plural, one {une forme} other {{count} formes}}')
		).toEqual([])
		expect(checkMessage('ja', COUNT, '{count}個の図形')).toEqual([])
		expect(
			checkMessage(
				'pl',
				'{count} shapes',
				'{count, plural, one {# kształt} few {# kształty} many {# kształtów} other {# kształtu}}'
			)
		).toEqual([])
	})

	it('rejects empty plural forms', () => {
		// From dotcom pl.json: Polish with 2–4 or 5+ reactions rendered nothing.
		expect(
			checkMessage(
				'pl',
				'{count, plural, one {Someone reacted} other {# people reacted}}',
				'{count, plural, one {Ktoś zareagował} few {} many {} other {# osób zareagowało}}'
			)
		).toEqual(['plural {count} has an empty "few" form', 'plural {count} has an empty "many" form'])
	})

	it('explains a lone apostrophe before an argument', () => {
		expect(checkMessage('fr', 'Edit {name}', "Modifier l'{name}")).toEqual([
			"missing argument {name} (a single ' before { quotes it; write '')",
		])
		expect(checkMessage('fr', 'Edit {name}', "Modifier l''{name}")).toEqual([])
	})

	it('ignores percent signs in ordinary text', () => {
		expect(checkMessage('fr', '50% off', '50%de réduction')).toEqual([])
	})

	it('requires the same rich-text tags', () => {
		expect(checkMessage('fr', '<b>{name}</b> joined', '{name} a rejoint')).toEqual([
			'missing tag <b>',
		])
		expect(checkMessage('fr', '{name} joined', '<i>{name}</i> a rejoint')).toEqual([
			'unknown tag <i>',
		])
	})
})

describe('validateCatalogs', () => {
	const roots: string[] = []
	afterEach(() => {
		for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
	})

	function makeRepo() {
		const root = mkdtempSync(path.join(tmpdir(), 'i18n-validate-'))
		roots.push(root)
		const write = (rel: string, value: unknown) => {
			mkdirSync(path.dirname(path.join(root, rel)), { recursive: true })
			writeFileSync(path.join(root, rel), JSON.stringify(value))
		}
		write('assets/translations/languages.json', [{ locale: 'en' }, { locale: 'fr' }])
		write('assets/translations/main.json', { 'action.copy': 'Copy', 'action.paste': 'Paste' })
		write('assets/translations/en.json', {})
		write('assets/translations/fr.json', { 'action.copy': 'Copier', 'action.gone': 'Parti' })
		write('assets/translations/ku.json', {})
		write('apps/dotcom/client/public/tla/locales/en.json', { abc: { translation: 'Hi {name}' } })
		write('apps/dotcom/client/public/tla/locales/fr.json', { abc: { translation: 'Salut {nom}' } })
		return root
	}

	it('checks both projects, counts gaps and removed keys, and reports unsupported files', () => {
		expect(validateCatalogs(makeRepo())).toEqual({
			errors: [
				{
					project: 'dotcom',
					locale: 'fr',
					key: 'abc',
					message: 'unknown argument {nom} (renamed or translated?)',
				},
				{ project: 'dotcom', locale: 'fr', key: 'abc', message: 'missing argument {name}' },
			],
			warnings: ['assets/translations/ku.json is not in languages.json, so it is never loaded'],
			missingCount: 1,
			obsoleteCount: 1,
		})
	})

	it('checks proposed entries against the English', () => {
		expect(
			validateEntries(makeRepo(), [
				{ project: 'sdk', locale: 'fr', key: 'action.paste', text: 'Coller' },
				{ project: 'dotcom', locale: 'fr', key: 'abc', text: 'Salut {nom}' },
				{ project: 'sdk', locale: 'fr', key: 'action.gone', text: 'Parti' },
			])
		).toEqual({
			'dotcom:fr:abc': [
				'unknown argument {nom} (renamed or translated?)',
				'missing argument {name}',
			],
			'sdk:fr:action.gone': ['key is not in the English catalog'],
		})
	})
})
