#!/usr/bin/env node
// Prints every translation that differs between two git refs, grouped by key with its English, as
// Markdown for a reviewer. Grouping by key rather than by language is deliberate: most machine
// translation mistakes repeat across languages ("Copy" as a noun in 17 of them), and they only
// stand out side by side.
//
//   node skills/review-translations/scripts/changed-strings.mjs [base] [head]
//
// Defaults to HEAD~1..HEAD, the shape of the automated "update i18n strings" commit.

import { execFileSync } from 'node:child_process'

const [base = 'HEAD~1', head = 'HEAD'] = process.argv.slice(2)

// A missing ref would read as "no catalogs", listing every string as new and spending the whole
// review on it, so fail instead.
for (const ref of [base, head]) {
	try {
		execFileSync('git', ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], { stdio: 'ignore' })
	} catch {
		console.error(`Unknown git ref: ${ref}`)
		process.exit(1)
	}
}

const PROJECTS = [
	{ name: 'sdk', dir: 'assets/translations', english: 'main.json' },
	{ name: 'dotcom', dir: 'apps/dotcom/client/public/tla/locales', english: 'en.json' },
]
const NOT_LOCALES = new Set(['en.json', 'main.json', 'languages.json'])

function git(...args) {
	return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
}

/** A catalog as key -> text. SDK catalogs are flat; dotcom's entries are `{ translation }`. */
function readCatalog(ref, file) {
	if (!git('ls-tree', '--name-only', ref, '--', file).trim()) return {}
	const json = JSON.parse(git('show', `${ref}:${file}`))
	const catalog = {}
	for (const [key, value] of Object.entries(json)) {
		const text = typeof value === 'string' ? value : value?.translation
		if (typeof text === 'string') catalog[key] = text
	}
	return catalog
}

// Escape only what breaks a table row: the reviewer reads this raw and copies text into fixes.
const cell = (text) => (text === undefined ? '—' : text.replace(/\|/g, '\\|').replace(/\n/g, '↵'))

const out = []
let total = 0
for (const project of PROJECTS) {
	const english = readCatalog(head, `${project.dir}/${project.english}`)
	const englishBefore = readCatalog(base, `${project.dir}/${project.english}`)
	const files = git('ls-tree', '--name-only', head, `${project.dir}/`)
		.split('\n')
		.filter((file) => file.endsWith('.json') && !NOT_LOCALES.has(file.split('/').pop()))

	const byKey = new Map()
	for (const file of files) {
		const locale = file.split('/').pop().replace(/\.json$/, '')
		const before = readCatalog(base, file)
		const after = readCatalog(head, file)
		for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
			if (before[key] === after[key]) continue
			if (!byKey.has(key)) byKey.set(key, [])
			byKey.get(key).push({ locale, before: before[key], after: after[key] })
		}
	}

	const removed = [...byKey].filter(([, rows]) => rows.every((row) => row.after === undefined))
	const changed = [...byKey].filter(([, rows]) => rows.some((row) => row.after !== undefined))
	total += changed.reduce((sum, [, rows]) => sum + rows.length, 0)

	out.push(`# ${project.name} (\`${project.dir}\`)`, '')
	out.push(`${changed.length} key(s) with new or changed translations.`, '')
	for (const [key, rows] of changed.sort(([a], [b]) => a.localeCompare(b))) {
		const reworded = englishBefore[key] !== undefined && englishBefore[key] !== english[key]
		out.push(`## \`${key}\``, '', `English: ${english[key] ?? '—'}`)
		if (reworded) out.push(`English before: ${englishBefore[key]}`)
		out.push('')
		out.push('| locale | before | after |', '| --- | --- | --- |')
		for (const row of rows) out.push(`| ${row.locale} | ${cell(row.before)} | ${cell(row.after)} |`)
		out.push('')
	}
	// A reword whose translations didn't change leaves them describing the old English.
	const stale = Object.keys(english).filter(
		(key) =>
			englishBefore[key] !== undefined && englishBefore[key] !== english[key] && !byKey.has(key)
	)
	if (stale.length) {
		out.push('English reworded, translations unchanged (check they still fit):', '')
		for (const key of stale) {
			out.push(`- \`${key}\`: ${englishBefore[key]} → ${english[key]}`)
		}
		out.push('')
	}
	if (removed.length) {
		out.push(`Removed (no review needed): ${removed.map(([key]) => `\`${key}\``).join(', ')}`, '')
	}
}

console.log(`Changed translations between ${base} and ${head}: ${total}\n\n${out.join('\n')}`)
