// Runs the translate skill end to end without a coordinating agent: context notes, triage of
// existing translations, blind generation, review, then apply. Each phase is a separate
// `claude -p` call with read-only tools and structured output, so the generator never shares a
// process or a conversation with the reviewer.
//
// Writes dispositions.json, unresolved.json, summary.json and summary.md to --out (a temp
// directory by default, never inside the repo) and applies the dispositions to the working tree.
// English must be committed: the generator's snapshot is HEAD.

import { spawn } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { apply, glossaryDirectory } from './apply.mjs'
import { contextDirectory, plan as contextPlan, record as recordContext } from './context.mjs'
import { snapshot } from './snapshot.mjs'
import { read, plan as statePlan } from './translation-state.mjs'

const MODELS = { context: 'sonnet', triage: 'opus', generate: 'sonnet', review: 'opus' }
// Entries per call. Big enough to amortise each call's fixed cost (system prompt, skill, code
// reading), small enough that one failed call loses little.
const ENTRIES_PER_CALL = { context: 30, triage: 120, generate: 120, review: 120 }
// One call may never spend more than this, whatever budget is left.
const MAX_CALL_USD = 5

const confidence = { type: 'string', enum: ['high', 'low'] }
const entryId = {
	project: { type: 'string', enum: ['sdk', 'dotcom'] },
	locale: { type: 'string' },
	key: { type: 'string' },
}
const glossarySchema = {
	type: 'object',
	additionalProperties: {
		type: 'object',
		properties: {
			register: { type: 'string' },
			terms: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						term: { type: 'string' },
						translation: { type: 'string' },
						note: { type: 'string' },
					},
					required: ['term', 'translation'],
				},
			},
		},
		required: ['terms'],
	},
}
const SCHEMAS = {
	context: {
		type: 'object',
		properties: {
			notes: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						project: entryId.project,
						key: entryId.key,
						role: {
							type: 'string',
							enum: ['action', 'label', 'state', 'heading', 'tooltip', 'announcement', 'error', 'body'],
						},
						meaning: { type: 'string' },
						callSites: { type: 'array', items: { type: 'string' } },
						placeholders: { type: 'object', additionalProperties: { type: 'string' } },
						constraints: { type: 'array', items: { type: 'string' } },
					},
					required: ['project', 'key', 'role', 'meaning', 'callSites'],
				},
			},
		},
		required: ['notes'],
	},
	triage: {
		type: 'object',
		properties: {
			entries: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						...entryId,
						decision: { type: 'string', enum: ['retain', 'regenerate', 'unresolved'] },
						confidence,
						reason: { type: 'string' },
					},
					required: ['project', 'locale', 'key', 'decision', 'confidence'],
				},
			},
			glossary: glossarySchema,
		},
		required: ['entries'],
	},
	generate: {
		type: 'object',
		properties: {
			candidates: {
				type: 'array',
				items: {
					type: 'object',
					properties: { ...entryId, text: { type: 'string' }, note: { type: 'string' } },
					required: ['project', 'locale', 'key', 'text'],
				},
			},
		},
		required: ['candidates'],
	},
	review: {
		type: 'object',
		properties: {
			entries: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						...entryId,
						decision: { type: 'string', enum: ['accept', 'revise', 'unresolved'] },
						text: { type: 'string' },
						confidence,
						reason: { type: 'string' },
					},
					required: ['project', 'locale', 'key', 'decision', 'confidence'],
				},
			},
			glossary: glossarySchema,
		},
		required: ['entries'],
	},
}

const PROMPTS = {
	context: `Follow section "2. Write context notes" of skills/translate/SKILL.md and the format in skills/translate/references/context-notes.md. For each message below, find its descriptor and call sites in this repository and write one note. callSites are repo-relative paths of files that exist. Return a note for every message.`,
	triage: `You are the reviewer. Follow section "4. Review" of skills/translate/SKILL.md. Each message below has existing translations to judge against its English, its context note and the code. For every locale entry decide: "retain" if the existing translation is correct for how the app uses it; "regenerate" if it is wrong (give the reason, which the next reviewer will see); "unresolved" only if the English itself is ambiguous. Set confidence "low" for any language whose software conventions you can't judge well. Propose glossary terms you verified. Return an entry for every locale entry.`,
	generate: `You are the translator. Follow section "3. Generate, blind" of skills/translate/SKILL.md. This workspace contains no existing translations; do not look for any. Use the code and the context notes to understand each message, then translate it into each listed locale. Return a candidate for every locale entry, with a note when unsure.`,
	review: `You are the reviewer. Follow section "4. Review" of skills/translate/SKILL.md. Each locale entry below has a candidate from a separate translator, plus the existing translation if there is one and why it was rejected. Check each candidate against the English, the context note, the code and the glossary. Decide "accept" (use the candidate as is), "revise" (give corrected text) or "unresolved". Set confidence "low" for any language whose software conventions you can't judge well. Propose glossary terms you verified. Return an entry for every locale entry.`,
}

const idOf = (e) => JSON.stringify([e.project, e.locale, e.key])
const messageId = (e) => `${e.project}/${e.key}`

function chunk(items, size) {
	const chunks = []
	for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
	return chunks
}

/** Groups locale entries by message, then splits so each batch holds about `size` locale entries. */
function batchByMessage(entries, size) {
	const groups = new Map()
	for (const entry of entries) {
		const id = messageId(entry)
		if (!groups.has(id)) groups.set(id, [])
		groups.get(id).push(entry)
	}
	const batches = []
	let current = []
	let count = 0
	for (const group of groups.values()) {
		if (count && count + group.length > size) {
			batches.push(current)
			current = []
			count = 0
		}
		current.push(...group)
		count += group.length
	}
	if (current.length) batches.push(current)
	return batches
}

function claudeArgs(model, budget) {
	const args = [
		'-p',
		'--model',
		model,
		'--tools',
		'Read,Grep,Glob',
		'--output-format',
		'json',
		'--no-session-persistence',
		'--max-budget-usd',
		budget.toFixed(2),
	]
	// --bare skips every hook, plugin and settings file (the repo has a Stop hook that formats
	// files), but it needs an API key. Without one (a local keychain login), turn the same
	// things off by hand.
	if (process.env.ANTHROPIC_API_KEY) args.push('--bare')
	else
		args.push(
			'--setting-sources',
			'',
			'--settings',
			'{"disableAllHooks":true}',
			'--strict-mcp-config'
		)
	return args
}

class Budget {
	constructor(limit) {
		this.limit = limit
		this.spent = 0
		this.byPhase = {}
	}
	get remaining() {
		return Math.max(0, this.limit - this.spent)
	}
	add(phase, usd) {
		this.spent += usd
		this.byPhase[phase] = (this.byPhase[phase] ?? 0) + usd
	}
}

function callClaude({ phase, prompt, cwd, budget }) {
	const allowance = Math.min(MAX_CALL_USD, budget.remaining)
	if (allowance < 0.05) return Promise.resolve(null)
	const args = [...claudeArgs(MODELS[phase], allowance), '--json-schema', JSON.stringify(SCHEMAS[phase])]
	return new Promise((resolvePromise) => {
		const child = spawn(process.env.CLAUDE_BIN ?? 'claude', args, {
			cwd,
			stdio: ['pipe', 'pipe', 'pipe'],
		})
		let stdout = ''
		let stderr = ''
		child.stdout.on('data', (d) => (stdout += d))
		child.stderr.on('data', (d) => (stderr += d))
		child.on('close', () => {
			let result = null
			try {
				result = JSON.parse(stdout)
			} catch {
				console.error(`[${phase}] unreadable output: ${(stderr || stdout).slice(0, 300)}`)
				return resolvePromise(null)
			}
			budget.add(phase, result.total_cost_usd ?? 0)
			if (result.is_error || !result.structured_output) {
				console.error(`[${phase}] failed: ${String(result.result ?? result.subtype).slice(0, 300)}`)
				return resolvePromise(null)
			}
			resolvePromise(result.structured_output)
		})
		child.stdin.end(prompt)
	})
}

/** Runs `task` over `items` with at most `limit` in flight, one retry each. */
async function pool(items, limit, task) {
	const results = new Array(items.length)
	let next = 0
	async function worker() {
		while (next < items.length) {
			const i = next++
			results[i] = (await task(items[i], i)) ?? (await task(items[i], i))
		}
	}
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
	return results
}

function promptFor(phase, payload) {
	return `${PROMPTS[phase]}\n\nInput (JSON):\n${JSON.stringify(payload, null, 1)}\n`
}

function loadGlossaries(root, locales) {
	const glossaries = {}
	for (const locale of locales) {
		const path = resolve(root, glossaryDirectory, `${locale}.json`)
		if (existsSync(path)) glossaries[locale] = read(path)
	}
	return glossaries
}

function loadNotes(root) {
	const notes = {}
	for (const project of ['sdk', 'dotcom']) {
		const path = resolve(root, contextDirectory, `${project}.json`)
		notes[project] = existsSync(path) ? read(path) : {}
	}
	return notes
}

/** Keeps only results for entries we asked about, so a confused reply can't touch other keys. */
function onlyRequested(results, requested) {
	const ids = new Set(requested.map(idOf))
	const seen = new Set()
	return results.filter((r) => {
		const id = idOf(r)
		if (!ids.has(id) || seen.has(id)) return false
		seen.add(id)
		return true
	})
}

/**
 * Drops locales the batch didn't ask about: apply.mjs rejects the whole run over one unknown
 * locale (a reviewer once returned "ru_"), after every phase has been paid for.
 */
function mergeGlossaryUpdates(target, update, batch) {
	const requested = new Set(batch.map((e) => e.locale))
	for (const [locale, value] of Object.entries(update ?? {})) {
		if (!requested.has(locale)) continue
		target[locale] ??= { terms: [] }
		if (value.register) target[locale].register = value.register
		target[locale].terms.push(...(value.terms ?? []))
	}
}

async function writeContextNotes(root, keys, budget, concurrency, log) {
	const wanted = new Set(keys)
	const pending = contextPlan(root).pending.filter((p) => wanted.has(messageId(p)))
	if (!pending.length) return
	log(`context: ${pending.length} notes to write`)
	const batches = chunk(pending, ENTRIES_PER_CALL.context)
	await pool(batches, concurrency, async (batch) => {
		const payload = batch.map(({ project, key, english, description }) => ({
			project,
			key,
			english,
			...(description ? { description } : {}),
		}))
		const output = await callClaude({ phase: 'context', prompt: promptFor('context', payload), cwd: root, budget })
		if (!output) return null
		const hashes = new Map(batch.map((p) => [messageId(p), p.sourceHash]))
		const notes = output.notes
			.filter((n) => hashes.has(messageId(n)))
			.map((n) => ({ ...n, sourceHash: hashes.get(messageId(n)) }))
		// Record one at a time so a single bad note (a call site that doesn't exist) doesn't
		// discard the rest of the batch.
		for (const note of notes) {
			try {
				recordContext(root, [note])
			} catch (error) {
				log(`context: skipped ${messageId(note)}: ${error.message}`)
			}
		}
		return true
	})
}

export async function run(
	root,
	{ mode, locales, budget: budgetUsd, out, concurrency = 4, limit: maxMessages, log = console.log, validate }
) {
	if (!['incremental', 'full-review'].includes(mode)) {
		throw new Error(`Unsupported mode "${mode}" (incremental or full-review)`)
	}
	mkdirSync(out, { recursive: true })
	const budget = new Budget(budgetUsd)
	const state = statePlan(root, locales, { includeCurrent: mode === 'full-review' })
	// Every unverified entry has had a full review that held it back (low confidence). Incremental
	// runs leave them out, or each weekly run would pay to review the same ~7,000 again and could
	// run out of budget before reaching new strings.
	const pending =
		mode === 'incremental' ? state.entries.filter((e) => e.reason !== 'unverified') : state.entries
	// --limit keeps the first n messages, for a cheap trial run.
	const keep = maxMessages ? new Set([...new Set(pending.map(messageId))].slice(0, maxMessages)) : null
	const work = keep ? pending.filter((e) => keep.has(messageId(e))) : pending
	const summary = { mode, locales: locales ?? 'all', pending: work.length, counts: state.counts }
	const spentSoFar = () => `$${budget.spent.toFixed(2)} spent so far`
	if (!work.length) {
		log('Nothing to translate.')
		writeFileSync(join(out, 'summary.json'), JSON.stringify(summary, null, 2) + '\n')
		return summary
	}
	log(`${work.length} entries (${JSON.stringify(state.counts)})`)

	await writeContextNotes(root, [...new Set(work.map(messageId))], budget, concurrency, log)
	const notes = loadNotes(root)
	const glossaries = loadGlossaries(root, [...new Set(work.map((e) => e.locale))])
	const messageFor = (e) => ({
		project: e.project,
		key: e.key,
		english: e.english,
		context: notes[e.project][e.key] ?? null,
	})
	const group = (entries, perLocale) => {
		const messages = new Map()
		for (const e of entries) {
			const id = messageId(e)
			if (!messages.has(id)) messages.set(id, { ...messageFor(e), locales: {} })
			messages.get(id).locales[e.locale] = perLocale(e)
		}
		return [...messages.values()]
	}
	const glossariesFor = (entries) =>
		Object.fromEntries(
			[...new Set(entries.map((e) => e.locale))].filter((l) => glossaries[l]).map((l) => [l, glossaries[l]])
		)

	const dispositions = []
	const glossaryUpdates = {}
	const rejected = new Map()

	// Triage: judge existing text first, so correct translations cost one review and no generation.
	const existing = work.filter((e) => e.translation !== null)
	log(`triage: ${existing.length} existing translations`)
	await pool(batchByMessage(existing, ENTRIES_PER_CALL.triage), concurrency, async (batch) => {
		const payload = {
			messages: group(batch, (e) => ({ reason: e.reason, existing: e.translation })),
			glossaries: glossariesFor(batch),
		}
		const output = await callClaude({ phase: 'triage', prompt: promptFor('triage', payload), cwd: root, budget })
		if (!output) return null
		for (const entry of onlyRequested(output.entries, batch)) {
			if (entry.decision === 'regenerate') rejected.set(idOf(entry), entry.reason ?? '')
			else {
				const { project, locale, key, decision, confidence, reason } = entry
				dispositions.push({ project, locale, key, decision, confidence, ...(reason ? { reason } : {}) })
			}
		}
		mergeGlossaryUpdates(glossaryUpdates, output.glossary, batch)
		return true
	})

	// Generate: missing entries plus those triage rejected, in a snapshot with no translations.
	const toGenerate = work.filter((e) => e.translation === null || rejected.has(idOf(e)))
	const candidates = new Map()
	if (toGenerate.length) {
		log(`generate: ${toGenerate.length} entries (${spentSoFar()})`)
		const snapshotDir = snapshot(root, join(out, 'snapshot'), { withGlossaries: true })
		// Notes written this run aren't committed yet, so HEAD's snapshot lacks them.
		cpSync(resolve(root, contextDirectory), join(snapshotDir, contextDirectory), { recursive: true })
		await pool(batchByMessage(toGenerate, ENTRIES_PER_CALL.generate), concurrency, async (batch) => {
			const payload = {
				messages: group(batch, () => ({})),
				glossaries: glossariesFor(batch),
			}
			const output = await callClaude({
				phase: 'generate',
				prompt: promptFor('generate', payload),
				cwd: snapshotDir,
				budget,
			})
			if (!output) return null
			for (const c of onlyRequested(output.candidates, batch)) candidates.set(idOf(c), c)
			return true
		})
	}

	// Review the candidates against the code, the existing text and why it was rejected.
	const toReview = toGenerate.filter((e) => candidates.has(idOf(e)))
	log(`review: ${toReview.length} candidates (${spentSoFar()})`)
	await pool(batchByMessage(toReview, ENTRIES_PER_CALL.review), concurrency, async (batch) => {
		const payload = {
			messages: group(batch, (e) => {
				const c = candidates.get(idOf(e))
				return {
					candidate: c.text,
					...(c.note ? { translatorNote: c.note } : {}),
					existing: e.translation,
					...(rejected.has(idOf(e)) ? { rejectedBecause: rejected.get(idOf(e)) } : {}),
				}
			}),
			glossaries: glossariesFor(batch),
		}
		const output = await callClaude({ phase: 'review', prompt: promptFor('review', payload), cwd: root, budget })
		if (!output) return null
		for (const entry of onlyRequested(output.entries, batch)) {
			const { project, locale, key, decision, confidence, reason } = entry
			const text = decision === 'accept' ? candidates.get(idOf(entry)).text : entry.text
			if (decision !== 'unresolved' && !text?.trim()) continue
			dispositions.push({
				project,
				locale,
				key,
				decision,
				confidence,
				...(decision === 'unresolved' ? {} : { text }),
				...(reason ? { reason } : {}),
			})
		}
		mergeGlossaryUpdates(glossaryUpdates, output.glossary, batch)
		return true
	})

	log(`translated (${spentSoFar()})`)
	const costs = () => ({ limit: budgetUsd, spent: Number(budget.spent.toFixed(2)), byPhase: budget.byPhase })
	// Written before apply as well, so a run that fails there still records what it cost.
	writeFileSync(join(out, 'summary.json'), JSON.stringify({ ...summary, budget: costs() }, null, 2) + '\n')
	const result = { entries: dispositions, glossary: glossaryUpdates }
	writeFileSync(join(out, 'dispositions.json'), JSON.stringify(result, null, 2) + '\n')
	// A missing translation shows in English, so unsure text beats none; it stays unverified.
	const applied = apply(root, result, { acceptLow: 'missing', ...(validate ? { validate } : {}) })
	writeFileSync(join(out, 'unresolved.json'), JSON.stringify(applied.unresolved, null, 2) + '\n')

	const decided = new Set(dispositions.map(idOf))
	Object.assign(summary, {
		applied: applied.applied,
		retained: applied.retained,
		writtenUnverified: applied.writtenUnverified,
		unresolved: applied.unresolved.length,
		// Entries with no decision at all: a failed call or the budget ran out. They stay pending.
		undecided: work.filter((e) => !decided.has(idOf(e))).length,
		budget: costs(),
		byLocale: countByLocale(dispositions),
	})
	writeFileSync(join(out, 'summary.json'), JSON.stringify(summary, null, 2) + '\n')
	writeFileSync(join(out, 'summary.md'), summaryMarkdown(summary, applied.unresolved))
	log(JSON.stringify({ ...summary, byLocale: undefined }))
	return summary
}

function countByLocale(dispositions) {
	const counts = {}
	for (const d of dispositions) {
		const key = d.confidence === 'low' && d.decision !== 'unresolved' ? 'low confidence' : d.decision
		counts[d.locale] ??= {}
		counts[d.locale][key] = (counts[d.locale][key] ?? 0) + 1
	}
	return counts
}

function summaryMarkdown(summary, unresolved) {
	const columns = ['retain', 'accept', 'revise', 'unresolved', 'low confidence']
	const lines = [
		`Mode: ${summary.mode}. Locales: ${Array.isArray(summary.locales) ? summary.locales.join(', ') : summary.locales}.`,
		'',
		`${summary.pending} entries: ${summary.applied} written (${summary.writtenUnverified} of them missing translations filled at low confidence, left unverified), ${summary.retained} kept as they were, ${summary.unresolved} held back, ${summary.undecided} not reached.`,
		'',
		`Cost: $${summary.budget.spent} of a $${summary.budget.limit} budget (${Object.entries(summary.budget.byPhase)
			.map(([phase, usd]) => `${phase} $${usd.toFixed(2)}`)
			.join(', ')}).`,
		'',
		`| Locale | ${columns.join(' | ')} |`,
		`| --- | ${columns.map(() => '---').join(' | ')} |`,
		...Object.entries(summary.byLocale)
			.sort()
			.map(([locale, c]) => `| ${locale} | ${columns.map((k) => c[k] ?? 0).join(' | ')} |`),
	]
	if (unresolved.length) {
		lines.push('', '<details><summary>Held back</summary>', '')
		for (const u of unresolved) {
			lines.push(`- \`${u.project}:${u.locale}:${u.key}\` (${u.decision}, ${u.confidence}): ${u.reason ?? ''}`)
		}
		lines.push('', '</details>')
	}
	return lines.join('\n') + '\n'
}

function parseArgs(argv) {
	const options = { budget: 25, concurrency: 4 }
	for (let i = 0; i < argv.length; i++) {
		const [flag, value] = [argv[i], argv[i + 1]]
		if (flag === '--mode') options.mode = value
		else if (flag === '--limit') options.limit = Number(value)
		else if (flag === '--locales') options.locales = value ? value.split(',').filter(Boolean) : undefined
		else if (flag === '--budget') options.budget = Number(value)
		else if (flag === '--concurrency') options.concurrency = Number(value)
		else if (flag === '--out') options.out = value
		else throw new Error(`Unknown option ${flag}`)
		i++
	}
	if (!options.mode || !(options.budget > 0) || !(options.concurrency > 0)) {
		throw new Error(
			'Usage: node skills/translate/scripts/run.mjs --mode incremental|full-review [--locales es,pl] [--budget 25] [--out dir] [--concurrency 4] [--limit n]'
		)
	}
	if (options.locales && !options.locales.length) options.locales = undefined
	return options
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		const options = parseArgs(process.argv.slice(2))
		const out = options.out ? resolve(options.out) : mkdtempSync(join(tmpdir(), 'translate-run-'))
		console.log(`Output: ${out}`)
		await run(process.cwd(), { ...options, out })
	} catch (error) {
		console.error(error.message)
		process.exitCode = 1
	}
}
