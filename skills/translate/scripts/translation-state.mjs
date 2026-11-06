import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const statePath = 'internal/i18n/translation-state.json'
const projects = {
	sdk: { source: 'assets/translations/main.json', directory: 'assets/translations' },
	dotcom: {
		source: 'apps/dotcom/client/public/tla/locales/en.json',
		directory: 'apps/dotcom/client/public/tla/locales',
	},
}
const read = (path) => JSON.parse(readFileSync(path, 'utf8'))
const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const text = (project, value) => (project === 'sdk' ? value : value?.translation)

function loadState(root) {
	const path = resolve(root, statePath)
	const state = existsSync(path) ? read(path) : { version: 1, entries: {} }
	if (state.version !== 1 || !state.entries || typeof state.entries !== 'object') {
		throw new Error('Unsupported translation state')
	}
	return state
}

export function plan(root, selectedLocales, { includeCurrent = false } = {}) {
	const state = loadState(root)
	const supported = read(resolve(root, 'assets/translations/languages.json'))
		.map(({ locale }) => locale)
		.filter((locale) => locale !== 'en')
	const locales = selectedLocales ?? supported
	for (const locale of locales) {
		if (!supported.includes(locale)) throw new Error(`Unsupported locale: ${locale}`)
	}
	const entries = []
	const counts = { current: 0, missing: 0, unverified: 0, sourceChanged: 0, translationChanged: 0 }
	const obsolete = []
	const unsupported = []
	for (const [project, config] of Object.entries(projects)) {
		const source = read(resolve(root, config.source))
		for (const filename of readdirSync(resolve(root, config.directory))) {
			if (!filename.endsWith('.json')) continue
			const locale = filename.slice(0, -5)
			if (['en', 'main', 'languages'].includes(locale) || locale.startsWith('xx-')) continue
			if (!supported.includes(locale)) {
				unsupported.push({ project, locale, targetPath: `${config.directory}/${filename}` })
			}
		}
		for (const locale of locales) {
			const targetPath = `${config.directory}/${locale}.json`
			const target = existsSync(resolve(root, targetPath)) ? read(resolve(root, targetPath)) : {}
			for (const key of Object.keys(target)) {
				if (!Object.hasOwn(source, key)) obsolete.push({ project, locale, key })
			}
			for (const [key, value] of Object.entries(source)) {
				const english = text(project, value)
				const translation = text(project, target[key])
				if (typeof english !== 'string') throw new Error(`Invalid English: ${project}/${key}`)
				if (translation !== undefined && typeof translation !== 'string') {
					throw new Error(`Invalid translation: ${project}/${locale}/${key}`)
				}
				const id = JSON.stringify([project, locale, key])
				// Include source metadata: a changed description may change a translation's meaning.
				const sourceHash = hash(value)
				const translationHash = hash(target[key] ?? null)
				const previous = state.entries[id]
				const reason = !translation?.trim()
					? 'missing'
					: !previous
						? 'unverified'
						: previous.sourceHash !== sourceHash
							? 'sourceChanged'
							: previous.translationHash !== translationHash
								? 'translationChanged'
								: 'current'
				counts[reason]++
				if (reason === 'current' && !includeCurrent) continue
				entries.push({
					project,
					locale,
					key,
					reason,
					sourceHash,
					translationHash,
					english,
					translation: translation ?? null,
					targetPath,
				})
			}
		}
	}
	return { version: 1, counts, entries, obsolete, unsupported }
}

function updateState(root, approvals, invalidate) {
	if (!Array.isArray(approvals) || !approvals.length)
		throw new Error('Expected nonempty approval array')
	const locales = [...new Set(approvals.map(({ locale }) => locale))]
	const pending = plan(root, locales, { includeCurrent: true })
	const byId = new Map(
		pending.entries.map((entry) => [
			JSON.stringify([entry.project, entry.locale, entry.key]),
			entry,
		])
	)
	const state = loadState(root)
	const seen = new Set()
	for (const approval of approvals) {
		const id = JSON.stringify([approval.project, approval.locale, approval.key])
		const entry = byId.get(id)
		if (seen.has(id)) throw new Error(`Duplicate approval: ${id}`)
		seen.add(id)
		if (!entry || entry.reason === 'missing') throw new Error(`No translated source entry: ${id}`)
		if (
			approval.sourceHash !== entry.sourceHash ||
			approval.translationHash !== entry.translationHash
		) {
			throw new Error(`Source or translation changed since review: ${id}`)
		}
		if (invalidate) delete state.entries[id]
		else
			state.entries[id] = { sourceHash: entry.sourceHash, translationHash: entry.translationHash }
	}
	state.entries = Object.fromEntries(
		Object.entries(state.entries).sort(([a], [b]) => a.localeCompare(b))
	)
	const path = resolve(root, statePath)
	mkdirSync(dirname(path), { recursive: true })
	writeFileSync(path, JSON.stringify(state, null, 2) + '\n')
}

export function record(root, approvals) {
	updateState(root, approvals, false)
}

export function invalidate(root, entries) {
	updateState(root, entries, true)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const [command, ...args] = process.argv.slice(2)
	try {
		const includeCurrent = args.includes('--all')
		const positional = args.filter((arg) => arg !== '--all')
		if (
			command === 'plan' &&
			positional.length <= 1 &&
			!positional.some((arg) => arg.startsWith('--'))
		) {
			console.log(
				JSON.stringify(plan(process.cwd(), positional[0]?.split(','), { includeCurrent }), null, 2)
			)
		} else if ((command === 'record' || command === 'invalidate') && args.length === 1) {
			updateState(process.cwd(), read(resolve(args[0])), command === 'invalidate')
		} else {
			throw new Error(
				'Usage: node skills/translate/scripts/translation-state.mjs plan [es,fr] [--all] | record <approved.json> | invalidate <unresolved.json>'
			)
		}
	} catch (error) {
		console.error(error.message)
		process.exitCode = 1
	}
}
