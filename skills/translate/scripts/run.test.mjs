import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { run } from './run.mjs'
import { plan } from './translation-state.mjs'

// Stands in for `claude -p`: answers each phase from the input in the prompt, and fails the
// generate phase if the workspace holds any translation, which is what keeps it blind.
const FAKE_CLAUDE = `#!/usr/bin/env node
const { existsSync } = require('node:fs')
const args = process.argv.slice(2)
const schema = JSON.parse(args[args.indexOf('--json-schema') + 1])
let stdin = ''
process.stdin.on('data', (d) => (stdin += d)).on('end', () => {
	const input = JSON.parse(stdin.slice(stdin.indexOf('Input (JSON):') + 'Input (JSON):'.length))
	const props = schema.properties
	const each = (fn) => input.messages.flatMap((m) => Object.entries(m.locales).map(([locale, l]) => fn(m, locale, l)))
	let output
	if (props.notes) {
		output = { notes: input.map(({ project, key }) => ({ project, key, role: 'action', meaning: 'Does a thing', callSites: ['src/actions.ts'] })) }
	} else if (props.candidates) {
		if (existsSync('assets/translations/es.json')) process.exit(3)
		output = { candidates: each((m, locale) => ({ project: m.project, locale, key: m.key, text: m.english + '-' + locale })) }
	} else if (props.entries.items.properties.decision.enum.includes('regenerate')) {
		output = { entries: each((m, locale, l) => ({
			project: m.project, locale, key: m.key,
			decision: l.existing === 'Cortar' ? 'regenerate' : 'retain',
			confidence: locale === 'pl' ? 'low' : 'high',
			...(l.existing === 'Cortar' ? { reason: 'Reads as cutting material' } : {}),
		})), glossary: { es: { terms: [{ term: 'Copy', translation: 'Copiar' }] }, es_: { terms: [] } } }
	} else {
		output = { entries: each((m, locale, l) => m.key === 'paste' && locale === 'pl'
			? { project: m.project, locale, key: m.key, decision: 'revise', text: 'Wklej', confidence: 'high', reason: 'Imperative' }
			: { project: m.project, locale, key: m.key, decision: 'accept', confidence: 'high' }) }
	}
	process.stdout.write(JSON.stringify({ is_error: false, total_cost_usd: 0.01, structured_output: output }))
})
`

function fixture(t) {
	const root = mkdtempSync(join(tmpdir(), 'translate-run-test-'))
	t.after(() => rmSync(root, { recursive: true, force: true }))
	const write = (path, value) => {
		mkdirSync(dirname(join(root, path)), { recursive: true })
		writeFileSync(join(root, path), typeof value === 'string' ? value : JSON.stringify(value))
	}
	write('assets/translations/languages.json', [{ locale: 'en' }, { locale: 'es' }, { locale: 'pl' }])
	write('assets/translations/main.json', { copy: 'Copy', cut: 'Cut', paste: 'Paste' })
	write('assets/translations/en.json', {})
	write('assets/translations/es.json', { copy: 'Copiar', cut: 'Cortar' })
	write('assets/translations/pl.json', { copy: 'Kopiuj' })
	write('apps/dotcom/client/public/tla/locales/en.json', { abc: { translation: 'Open' } })
	write('apps/dotcom/client/public/tla/locales/es.json', { abc: { translation: 'Abrir' } })
	write('apps/dotcom/client/public/tla/locales/pl.json', {})
	write('src/actions.ts', "defineMessages({ copy: 'Copy' })")
	write('bin/claude', FAKE_CLAUDE)
	chmodSync(join(root, 'bin/claude'), 0o755)
	const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'ignore' })
	git('init', '-q')
	git('add', '-A')
	git('-c', 'user.name=test', '-c', 'user.email=test@example.com', 'commit', '-qm', 'fixture')
	return root
}

test('run triages, generates blind, reviews and applies, holding back low confidence', async (t) => {
	const root = fixture(t)
	const out = join(root, '..', `${root.split('/').pop()}-out`)
	t.after(() => rmSync(out, { recursive: true, force: true }))
	process.env.CLAUDE_BIN = join(root, 'bin/claude')
	t.after(() => delete process.env.CLAUDE_BIN)

	const summary = await run(root, {
		mode: 'incremental',
		locales: ['es', 'pl'],
		budget: 1,
		out,
		log: () => {},
		validate: () => ({}),
	})

	const read = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'))
	assert.deepEqual(read('assets/translations/es.json'), {
		copy: 'Copiar',
		cut: 'Cut-es',
		paste: 'Paste-es',
	})
	assert.deepEqual(read('assets/translations/pl.json'), {
		// Kept as it was: triage retained it with low confidence, so it's held back.
		copy: 'Kopiuj',
		cut: 'Cut-pl',
		paste: 'Wklej',
	})
	assert.deepEqual(read('apps/dotcom/client/public/tla/locales/pl.json'), {
		abc: { translation: 'Open-pl' },
	})
	assert.deepEqual(read('internal/i18n/glossary/es.json'), {
		register: '',
		terms: [{ term: 'Copy', translation: 'Copiar' }],
	})
	assert.equal(read('internal/i18n/context/sdk.json').copy.role, 'action')
	assert.deepEqual(
		{
			pending: summary.pending,
			applied: summary.applied,
			retained: summary.retained,
			unresolved: summary.unresolved,
			undecided: summary.undecided,
			spent: summary.budget.spent,
		},
		{ pending: 8, applied: 5, retained: 2, unresolved: 1, undecided: 0, spent: 0.04 }
	)
	assert.equal(plan(root, ['pl']).entries.find((e) => e.key === 'copy').reason, 'unverified')
	assert.match(readFileSync(join(out, 'summary.md'), 'utf8'), /sdk:pl:copy/)
})

test('run stops starting calls once the budget is spent and leaves the rest pending', async (t) => {
	const root = fixture(t)
	const out = join(root, '..', `${root.split('/').pop()}-out`)
	t.after(() => rmSync(out, { recursive: true, force: true }))
	process.env.CLAUDE_BIN = join(root, 'bin/claude')
	t.after(() => delete process.env.CLAUDE_BIN)

	const summary = await run(root, {
		mode: 'incremental',
		locales: ['es', 'pl'],
		budget: 0.065,
		out,
		log: () => {},
		validate: () => ({}),
	})
	// Context and triage fit in the budget; generation and review don't start.
	assert.equal(summary.applied, 0)
	assert.equal(summary.undecided, 5)
	assert.deepEqual(JSON.parse(readFileSync(join(root, 'assets/translations/es.json'), 'utf8')), {
		copy: 'Copiar',
		cut: 'Cortar',
	})
})

test('run records what it spent even when apply fails', async (t) => {
	const root = fixture(t)
	const out = join(root, '..', `${root.split('/').pop()}-out`)
	t.after(() => rmSync(out, { recursive: true, force: true }))
	process.env.CLAUDE_BIN = join(root, 'bin/claude')
	t.after(() => delete process.env.CLAUDE_BIN)

	await assert.rejects(
		run(root, {
			mode: 'incremental',
			locales: ['es', 'pl'],
			budget: 1,
			out,
			log: () => {},
			validate: () => {
				throw new Error('validator crashed')
			},
		}),
		/validator crashed/
	)
	assert.equal(JSON.parse(readFileSync(join(out, 'summary.json'), 'utf8')).budget.spent, 0.04)
})
