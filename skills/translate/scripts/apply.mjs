// Applies a reviewer's dispositions to the catalogs, records the accepted pairs in the review
// ledger, and merges glossary updates. Claude never edits catalogs directly; this does.
//
//   node skills/translate/scripts/apply.mjs <dispositions.json> [--unresolved <out.json>]
//
// See references/dispositions.md for the input format.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { plan, record } from './translation-state.mjs'

export const glossaryDirectory = 'internal/i18n/glossary'
const DECISIONS = ['retain', 'accept', 'revise', 'unresolved']
const projects = {
	// SDK catalogs are flat `{key: text}`, keys sorted, tab-indented.
	sdk: { directory: 'assets/translations', indent: '\t' },
	// dotcom catalogs are `{key: {translation, ...metadata}}`, keys sorted, 2-space indented.
	dotcom: { directory: 'apps/dotcom/client/public/tla/locales', indent: 2 },
}

const read = (path) => JSON.parse(readFileSync(path, 'utf8'))
const idOf = (entry) => JSON.stringify([entry.project, entry.locale, entry.key])
const byKey = ([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)

function checkEntry(entry) {
	const id = idOf(entry)
	if (!projects[entry.project]) throw new Error(`Unknown project: ${id}`)
	if (!DECISIONS.includes(entry.decision)) throw new Error(`Invalid decision "${entry.decision}": ${id}`)
	if (entry.confidence !== 'high' && entry.confidence !== 'low') {
		throw new Error(`Confidence must be "high" or "low": ${id}`)
	}
	const needsText = entry.decision === 'accept' || entry.decision === 'revise'
	if (needsText && (typeof entry.text !== 'string' || !entry.text.trim())) {
		throw new Error(`"${entry.decision}" needs the final text: ${id}`)
	}
	if (!needsText && entry.text !== undefined) {
		throw new Error(`"${entry.decision}" must not carry text: ${id}`)
	}
}

function writeCatalog(root, project, locale, catalog) {
	const { directory, indent } = projects[project]
	const sorted = Object.fromEntries(Object.entries(catalog).sort(byKey))
	writeFileSync(
		resolve(root, directory, `${locale}.json`),
		JSON.stringify(sorted, null, indent) + '\n'
	)
}

function mergeGlossaries(root, glossary) {
	for (const [locale, update] of Object.entries(glossary ?? {})) {
		const path = resolve(root, glossaryDirectory, `${locale}.json`)
		const current = existsSync(path) ? read(path) : { register: '', terms: [] }
		const terms = new Map(current.terms.map((t) => [t.term.toLowerCase(), t]))
		for (const term of update.terms ?? []) {
			if (!term.term?.trim() || !term.translation?.trim()) {
				throw new Error(`Glossary terms need a term and a translation: ${locale}`)
			}
			terms.set(term.term.toLowerCase(), {
				term: term.term,
				translation: term.translation,
				...(term.note ? { note: term.note } : {}),
			})
		}
		const next = {
			register: update.register ?? current.register,
			terms: [...terms.values()].sort((a, b) => a.term.localeCompare(b.term, 'en')),
		}
		mkdirSync(dirname(path), { recursive: true })
		writeFileSync(path, JSON.stringify(next, null, '\t') + '\n')
	}
}

/**
 * Returns `{ applied, retained, unresolved }`. Unresolved and low-confidence entries change
 * nothing and stay pending in the ledger, so the next run picks them up again.
 */
export function apply(root, dispositions) {
	const entries = dispositions?.entries
	if (!Array.isArray(entries)) throw new Error('Expected { entries: [...] }')
	const seen = new Set()
	for (const entry of entries) {
		checkEntry(entry)
		if (seen.has(idOf(entry))) throw new Error(`Duplicate disposition: ${idOf(entry)}`)
		seen.add(idOf(entry))
	}

	const locales = [...new Set(entries.map((e) => e.locale))]
	const before = locales.length ? plan(root, locales, { includeCurrent: true }) : { entries: [] }
	const current = new Map(before.entries.map((e) => [idOf(e), e]))

	const unresolved = []
	const accepted = []
	const catalogs = new Map()
	const catalogFor = (project, locale) => {
		const id = `${project}/${locale}`
		if (!catalogs.has(id)) {
			const path = resolve(root, projects[project].directory, `${locale}.json`)
			catalogs.set(id, { project, locale, data: existsSync(path) ? read(path) : {} })
		}
		return catalogs.get(id).data
	}
	const sourceFor = (project) =>
		read(
			resolve(
				root,
				project === 'sdk' ? 'assets/translations/main.json' : `${projects.dotcom.directory}/en.json`
			)
		)
	const sources = { sdk: sourceFor('sdk'), dotcom: sourceFor('dotcom') }

	let applied = 0
	let retained = 0
	for (const entry of entries) {
		const existing = current.get(idOf(entry))
		if (!existing) throw new Error(`Not a current source message: ${idOf(entry)}`)
		if (entry.decision === 'unresolved' || entry.confidence === 'low') {
			unresolved.push({ ...entry, english: existing.english, translation: existing.translation })
			continue
		}
		if (entry.decision === 'retain') {
			if (existing.reason === 'missing') throw new Error(`Nothing to retain: ${idOf(entry)}`)
			retained++
			accepted.push(entry)
			continue
		}
		const catalog = catalogFor(entry.project, entry.locale)
		if (entry.project === 'sdk') {
			catalog[entry.key] = entry.text
		} else {
			// New entries carry the English metadata (such as `notes`) over, untranslated.
			const { translation: _english, ...metadata } = sources.dotcom[entry.key]
			catalog[entry.key] = { ...metadata, ...catalog[entry.key], translation: entry.text }
		}
		applied++
		accepted.push(entry)
	}

	for (const { project, locale, data } of catalogs.values()) writeCatalog(root, project, locale, data)

	if (accepted.length) {
		// Hash what is on disk now, which is exactly what the reviewer approved.
		const after = plan(root, [...new Set(accepted.map((e) => e.locale))], { includeCurrent: true })
		const afterById = new Map(after.entries.map((e) => [idOf(e), e]))
		record(
			root,
			accepted.map((entry) => {
				const { project, locale, key, sourceHash, translationHash } = afterById.get(idOf(entry))
				return { project, locale, key, sourceHash, translationHash }
			})
		)
	}
	mergeGlossaries(root, dispositions.glossary)

	return { applied, retained, unresolved }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const args = process.argv.slice(2)
	try {
		const unresolvedFlag = args.indexOf('--unresolved')
		const unresolvedPath = unresolvedFlag === -1 ? null : args[unresolvedFlag + 1]
		const positional =
			unresolvedFlag === -1
				? args
				: args.filter((_, i) => i !== unresolvedFlag && i !== unresolvedFlag + 1)
		if (positional.length !== 1 || (unresolvedFlag !== -1 && !unresolvedPath)) {
			throw new Error(
				'Usage: node skills/translate/scripts/apply.mjs <dispositions.json> [--unresolved <out.json>]'
			)
		}
		const result = apply(process.cwd(), read(resolve(positional[0])))
		if (unresolvedPath) {
			writeFileSync(resolve(unresolvedPath), JSON.stringify(result.unresolved, null, 2) + '\n')
		}
		console.log(
			JSON.stringify({
				applied: result.applied,
				retained: result.retained,
				unresolved: result.unresolved.length,
			})
		)
	} catch (error) {
		console.error(error.message)
		process.exitCode = 1
	}
}
