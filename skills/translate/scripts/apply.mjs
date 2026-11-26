// Applies a reviewer's dispositions to the catalogs, records the accepted pairs in the review
// ledger, and merges glossary updates. See references/dispositions.md for the input format.

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { invalidate, plan, projects, read, record } from './translation-state.mjs'

export const glossaryDirectory = 'internal/i18n/glossary'
const DECISIONS = ['retain', 'accept', 'revise', 'unresolved']
const INDENT = { sdk: '\t', dotcom: 2 }

const idOf = (entry) => JSON.stringify([entry.project, entry.locale, entry.key])
const problemId = (entry) => `${entry.project}:${entry.locale}:${entry.key}`

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

function checkGlossary(glossary, supported) {
	for (const [locale, update] of Object.entries(glossary ?? {})) {
		// The locale becomes a file name, so it must be one we know.
		if (!supported.includes(locale)) throw new Error(`Glossary for unsupported locale: ${locale}`)
		if (update.register !== undefined && typeof update.register !== 'string') {
			throw new Error(`Glossary register must be a string: ${locale}`)
		}
		if (!Array.isArray(update.terms)) throw new Error(`Glossary terms must be an array: ${locale}`)
		for (const term of update.terms) {
			if (typeof term.term !== 'string' || !term.term.trim()) {
				throw new Error(`Glossary term needs a term: ${locale}`)
			}
			if (typeof term.translation !== 'string' || !term.translation.trim()) {
				throw new Error(`Glossary term "${term.term}" needs a translation: ${locale}`)
			}
		}
	}
}

/** Runs the repo's ICU validator over the proposed texts; returns `{ problemId: errors[] }`. */
function validateWithRepo(root, entries) {
	const dir = mkdtempSync(join(tmpdir(), 'translate-apply-'))
	try {
		const file = join(dir, 'entries.json')
		writeFileSync(file, JSON.stringify(entries))
		const out = execFileSync('pnpm', ['-s', 'i18n-validate', '--entries', file], {
			cwd: root,
			encoding: 'utf8',
		})
		return JSON.parse(out.trim().split('\n').pop())
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
}

/** Sets `key` while keeping the catalog's existing order; new keys go in alphabetical position. */
function setInOrder(catalog, key, value) {
	if (Object.hasOwn(catalog, key)) {
		catalog[key] = value
		return catalog
	}
	const entries = Object.entries(catalog)
	const index = entries.findIndex(([k]) => k > key)
	entries.splice(index === -1 ? entries.length : index, 0, [key, value])
	return Object.fromEntries(entries)
}

function mergeGlossaries(root, glossary) {
	for (const [locale, update] of Object.entries(glossary ?? {})) {
		const path = resolve(root, glossaryDirectory, `${locale}.json`)
		const current = existsSync(path) ? read(path) : { register: '', terms: [] }
		const terms = new Map(current.terms.map((t) => [t.term.toLowerCase(), t]))
		for (const { term, translation, note } of update.terms) {
			terms.set(term.toLowerCase(), { term, translation, ...(note ? { note } : {}) })
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
 * Returns `{ applied, retained, unresolved }`. Nothing is written until the whole input checks
 * out. Unresolved, low-confidence and invalid entries change no text, and are left pending in the
 * ledger (approval withdrawn if they had one), so the next run picks them up.
 *
 * `validate` defaults to the repo's `pnpm i18n-validate --entries`.
 */
export function apply(root, dispositions, { validate = validateWithRepo } = {}) {
	const entries = dispositions?.entries
	if (!Array.isArray(entries)) throw new Error('Expected { entries: [...] }')
	const supported = read(resolve(root, 'assets/translations/languages.json')).map((l) => l.locale)
	const seen = new Set()
	for (const entry of entries) {
		checkEntry(entry)
		if (seen.has(idOf(entry))) throw new Error(`Duplicate disposition: ${idOf(entry)}`)
		seen.add(idOf(entry))
	}
	checkGlossary(dispositions.glossary, supported)

	const locales = [...new Set(entries.map((e) => e.locale))]
	const before = locales.length ? plan(root, locales, { includeCurrent: true }) : { entries: [] }
	const current = new Map(before.entries.map((e) => [idOf(e), e]))
	for (const entry of entries) {
		const existing = current.get(idOf(entry))
		if (!existing) throw new Error(`Not a current source message: ${idOf(entry)}`)
		if (entry.decision === 'retain' && existing.reason === 'missing') {
			throw new Error(`Nothing to retain: ${idOf(entry)}`)
		}
	}

	// Retained text is checked too: a reviewer can keep a translation that is already broken.
	const proposed = entries
		.filter((e) => e.decision !== 'unresolved' && e.confidence === 'high')
		.map(({ project, locale, key, text }) => ({
			project,
			locale,
			key,
			text: text ?? current.get(idOf({ project, locale, key })).translation,
		}))
	const invalid = proposed.length ? validate(root, proposed) : {}

	const unresolved = []
	const accepted = []
	const catalogs = new Map()
	const catalogFor = (project, locale) => {
		const id = `${project}/${locale}`
		if (!catalogs.has(id)) {
			const path = resolve(root, projects[project].directory, `${locale}.json`)
			catalogs.set(id, { project, locale, data: existsSync(path) ? read(path) : {} })
		}
		return catalogs.get(id)
	}
	const dotcomEnglish = read(resolve(root, projects.dotcom.source))

	let applied = 0
	let retained = 0
	for (const entry of entries) {
		const existing = current.get(idOf(entry))
		const errors = invalid[problemId(entry)]
		if (entry.decision === 'unresolved' || entry.confidence === 'low' || errors) {
			unresolved.push({
				...entry,
				...(errors ? { reason: `Fails validation: ${errors.join('; ')}` } : {}),
				english: existing.english,
				translation: existing.translation,
			})
			continue
		}
		if (entry.decision === 'retain') {
			retained++
			accepted.push(entry)
			continue
		}
		const catalog = catalogFor(entry.project, entry.locale)
		if (entry.project === 'sdk') {
			catalog.data = setInOrder(catalog.data, entry.key, entry.text)
		} else {
			// English metadata (such as `notes`) fills in fields the target lacks; the target's own
			// metadata wins, so existing entries keep theirs.
			const { translation: _english, ...metadata } = dotcomEnglish[entry.key]
			catalog.data = setInOrder(catalog.data, entry.key, {
				...metadata,
				...catalog.data[entry.key],
				translation: entry.text,
			})
		}
		applied++
		accepted.push(entry)
	}

	for (const { project, locale, data } of catalogs.values()) {
		writeFileSync(
			resolve(root, projects[project].directory, `${locale}.json`),
			JSON.stringify(data, null, INDENT[project]) + '\n'
		)
	}

	// A held-back entry that was already approved would otherwise stay `current` and drop out of
	// incremental runs, so its approval is withdrawn.
	const withdrawn = unresolved
		.map((u) => current.get(idOf(u)))
		.filter((e) => e.reason === 'current')
		.map(({ project, locale, key, sourceHash, translationHash }) => ({
			project,
			locale,
			key,
			sourceHash,
			translationHash,
		}))
	if (withdrawn.length) invalidate(root, withdrawn)

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
	const [file, flag, unresolvedPath, ...rest] = process.argv.slice(2)
	try {
		if (!file || rest.length || (flag && (flag !== '--unresolved' || !unresolvedPath))) {
			throw new Error(
				'Usage: node skills/translate/scripts/apply.mjs <dispositions.json> [--unresolved <out.json>]'
			)
		}
		const result = apply(process.cwd(), read(resolve(file)))
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
