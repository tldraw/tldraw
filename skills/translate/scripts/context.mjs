// Cached context notes: what each English message is for, so translators and reviewers don't
// have to rediscover it from the code on every run. See references/context-notes.md.
//
//   node skills/translate/scripts/context.mjs plan [--all]
//   node skills/translate/scripts/context.mjs record <notes.json>

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const contextDirectory = 'internal/i18n/context'
const sources = {
	sdk: 'assets/translations/main.json',
	dotcom: 'apps/dotcom/client/public/tla/locales/en.json',
}
const ROLES = ['action', 'label', 'state', 'heading', 'tooltip', 'announcement', 'error', 'body']

const read = (path) => JSON.parse(readFileSync(path, 'utf8'))
const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const english = (project, value) => (project === 'sdk' ? value : value.translation)

function loadNotes(root, project) {
	const path = resolve(root, contextDirectory, `${project}.json`)
	return existsSync(path) ? read(path) : {}
}

/**
 * Lists messages whose note is missing or stale. A note goes stale when the English or its
 * metadata changes, or when a call site it names no longer exists. A behaviour change at an
 * unchanged call site isn't detected; `--all` refreshes every note for that.
 */
export function plan(root, { all = false } = {}) {
	const pending = []
	const obsolete = []
	for (const [project, sourcePath] of Object.entries(sources)) {
		const source = read(resolve(root, sourcePath))
		const notes = loadNotes(root, project)
		for (const [key, value] of Object.entries(source)) {
			const sourceHash = hash(value)
			const note = notes[key]
			const reason = !note
				? 'missing'
				: note.sourceHash !== sourceHash
					? 'sourceChanged'
					: note.callSites.some((file) => !existsSync(resolve(root, file)))
						? 'callSiteMoved'
						: all
							? 'refresh'
							: null
			if (!reason) continue
			pending.push({
				project,
				key,
				reason,
				sourceHash,
				english: english(project, value),
				...(value.notes ? { description: value.notes } : {}),
				...(note ? { previousNote: note } : {}),
			})
		}
		for (const key of Object.keys(notes)) {
			if (!Object.hasOwn(source, key)) obsolete.push({ project, key })
		}
	}
	return { pending, obsolete }
}

function checkNote(root, note, source) {
	const id = `${note.project}/${note.key}`
	if (!Object.hasOwn(source, note.key)) throw new Error(`Unknown message: ${id}`)
	if (note.sourceHash !== hash(source[note.key])) {
		throw new Error(`English changed since the note was written: ${id}`)
	}
	if (!ROLES.includes(note.role)) throw new Error(`Invalid role "${note.role}": ${id}`)
	if (!Array.isArray(note.callSites) || !note.callSites.length) {
		throw new Error(`A note needs at least one call site: ${id}`)
	}
	for (const file of note.callSites) {
		if (!existsSync(resolve(root, file))) throw new Error(`Missing call site ${file}: ${id}`)
	}
	if (typeof note.meaning !== 'string' || !note.meaning.trim()) {
		throw new Error(`A note needs a meaning: ${id}`)
	}
}

/** Saves notes after checking each against the current English, and drops notes for removed messages. */
export function record(root, notes) {
	if (!Array.isArray(notes) || !notes.length) throw new Error('Expected a nonempty array of notes')
	const byProject = {}
	for (const project of Object.keys(sources)) {
		byProject[project] = { source: read(resolve(root, sources[project])), notes: loadNotes(root, project) }
	}
	const seen = new Set()
	for (const note of notes) {
		const target = byProject[note.project]
		if (!target) throw new Error(`Unknown project: ${note.project}`)
		const id = `${note.project}/${note.key}`
		if (seen.has(id)) throw new Error(`Duplicate note: ${id}`)
		seen.add(id)
		checkNote(root, note, target.source)
	}
	for (const note of notes) {
		const { project, key, ...rest } = note
		byProject[project].notes[key] = {
			sourceHash: rest.sourceHash,
			role: rest.role,
			meaning: rest.meaning,
			callSites: [...rest.callSites].sort(),
			...(rest.placeholders && Object.keys(rest.placeholders).length
				? { placeholders: rest.placeholders }
				: {}),
			...(rest.constraints?.length ? { constraints: rest.constraints } : {}),
		}
	}
	for (const [project, { source, notes: projectNotes }] of Object.entries(byProject)) {
		const kept = Object.fromEntries(
			Object.entries(projectNotes)
				.filter(([key]) => Object.hasOwn(source, key))
				.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
		)
		const path = resolve(root, contextDirectory, `${project}.json`)
		mkdirSync(dirname(path), { recursive: true })
		writeFileSync(path, JSON.stringify(kept, null, '\t') + '\n')
	}
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const [command, ...args] = process.argv.slice(2)
	try {
		if (command === 'plan' && args.every((arg) => arg === '--all')) {
			console.log(JSON.stringify(plan(process.cwd(), { all: args.includes('--all') }), null, 2))
		} else if (command === 'record' && args.length === 1) {
			record(process.cwd(), read(resolve(args[0])))
		} else {
			throw new Error(
				'Usage: node skills/translate/scripts/context.mjs plan [--all] | record <notes.json>'
			)
		}
	} catch (error) {
		console.error(error.message)
		process.exitCode = 1
	}
}
