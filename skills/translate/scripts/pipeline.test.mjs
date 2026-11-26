import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { apply } from './apply.mjs'
import { plan as contextPlan, record as recordContext } from './context.mjs'
import { snapshot } from './snapshot.mjs'
import { plan } from './translation-state.mjs'

function fixture(t) {
	const root = mkdtempSync(join(tmpdir(), 'translate-pipeline-test-'))
	t.after(() => rmSync(root, { recursive: true, force: true }))
	const write = (path, value) => {
		mkdirSync(dirname(join(root, path)), { recursive: true })
		writeFileSync(join(root, path), typeof value === 'string' ? value : JSON.stringify(value))
	}
	const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'))
	write('assets/translations/languages.json', [{ locale: 'en' }, { locale: 'es' }, { locale: 'pl' }])
	write('assets/translations/main.json', { copy: 'Copy', cut: 'Cut', paste: 'Paste' })
	write('assets/translations/en.json', {})
	write('assets/translations/es.json', { copy: 'Copiar', cut: 'Cortar', legacy: 'Conservar' })
	write('assets/translations/pl.json', { copy: 'Kopiuj' })
	write('apps/dotcom/client/public/tla/locales/en.json', {
		abc: { translation: 'Open' },
		def: { notes: 'Shown after publishing', translation: 'Published' },
	})
	write('apps/dotcom/client/public/tla/locales/es.json', { abc: { translation: 'Abrir' } })
	write('apps/dotcom/client/public/tla/locales/pl.json', {})
	write('packages/tldraw/src/actions.ts', "defineMessages({ copy: 'Copy' })")
	return { root, write, readJson }
}

const disposition = (entry) => ({ project: 'sdk', locale: 'es', confidence: 'high', ...entry })
// Fixture repos have no ICU validator; tests that need one pass their own.
const valid = { validate: () => ({}) }

test('apply writes accepted text, records it, and leaves out-of-scope keys alone', (t) => {
	const { root, readJson } = fixture(t)
	const result = apply(root, {
		entries: [
			disposition({ key: 'paste', decision: 'accept', text: 'Pegar' }),
			disposition({ key: 'copy', decision: 'retain' }),
		],
	}, valid)
	assert.deepEqual({ ...result, unresolved: result.unresolved.length }, {
		applied: 1,
		retained: 1,
		unresolved: 0,
	})
	assert.deepEqual(readJson('assets/translations/es.json'), {
		copy: 'Copiar',
		cut: 'Cortar',
		legacy: 'Conservar',
		paste: 'Pegar',
	})
	assert.equal(
		readFileSync(join(root, 'assets/translations/es.json'), 'utf8'),
		'{\n\t"copy": "Copiar",\n\t"cut": "Cortar",\n\t"legacy": "Conservar",\n\t"paste": "Pegar"\n}\n'
	)
	assert.deepEqual(plan(root, ['es']).counts, {
		current: 2,
		// dotcom `def` has no Spanish yet.
		missing: 1,
		unverified: 2,
		sourceChanged: 0,
		translationChanged: 0,
	})
	assert.deepEqual(readJson('assets/translations/pl.json'), { copy: 'Kopiuj' })
})

test('apply holds back unresolved and low-confidence entries', (t) => {
	const { root, readJson } = fixture(t)
	const result = apply(root, {
		entries: [
			disposition({ key: 'paste', decision: 'accept', text: 'Pegar', confidence: 'low' }),
			disposition({ key: 'cut', decision: 'unresolved', reason: 'Clipboard sense unclear' }),
		],
	}, valid)
	assert.equal(result.applied, 0)
	assert.deepEqual(
		result.unresolved.map(({ key, translation }) => ({ key, translation })),
		[
			{ key: 'paste', translation: null },
			{ key: 'cut', translation: 'Cortar' },
		]
	)
	assert.equal(readJson('assets/translations/es.json').paste, undefined)
	assert.equal(plan(root, ['es']).counts.current, 0)
})

test('apply keeps the dotcom shape and carries English metadata to new entries', (t) => {
	const { root, readJson } = fixture(t)
	apply(root, {
		entries: [
			disposition({ project: 'dotcom', key: 'def', decision: 'accept', text: 'Publicado' }),
			disposition({ project: 'dotcom', key: 'abc', decision: 'revise', text: 'Abrir archivo' }),
		],
	}, valid)
	assert.deepEqual(readJson('apps/dotcom/client/public/tla/locales/es.json'), {
		abc: { translation: 'Abrir archivo' },
		def: { notes: 'Shown after publishing', translation: 'Publicado' },
	})
	assert.match(
		readFileSync(join(root, 'apps/dotcom/client/public/tla/locales/es.json'), 'utf8'),
		/^\{\n {2}"abc": \{\n {4}"translation"/
	)
})

test('apply rejects bad input before writing anything', (t) => {
	const { root } = fixture(t)
	const before = readFileSync(join(root, 'assets/translations/es.json'), 'utf8')
	const bad = [
		[disposition({ key: 'paste', decision: 'accept' }), /needs the final text/],
		[disposition({ key: 'copy', decision: 'retain', text: 'x' }), /must not carry text/],
		[disposition({ key: 'copy', decision: 'retain', confidence: 'medium' }), /Confidence/],
		[disposition({ key: 'paste', decision: 'retain' }), /Nothing to retain/],
		[disposition({ key: 'legacy', decision: 'accept', text: 'x' }), /Not a current source/],
	]
	for (const [entry, error] of bad) {
		assert.throws(
			() => apply(root, { entries: [disposition({ key: 'cut', decision: 'retain' }), entry] }, valid),
			error
		)
	}
	assert.equal(readFileSync(join(root, 'assets/translations/es.json'), 'utf8'), before)
	assert.equal(plan(root, ['es']).counts.current, 0)
})

test('apply merges glossary updates into existing terms', (t) => {
	const { root, write, readJson } = fixture(t)
	write('internal/i18n/glossary/es.json', {
		register: 'Usted, imperative for actions',
		terms: [{ term: 'Copy', translation: 'Copiar' }],
	})
	apply(root, {
		entries: [],
		glossary: {
			es: { terms: [{ term: 'Paste', translation: 'Pegar', note: 'Clipboard command, not glue' }] },
		},
	}, valid)
	assert.deepEqual(readJson('internal/i18n/glossary/es.json'), {
		register: 'Usted, imperative for actions',
		terms: [
			{ term: 'Copy', translation: 'Copiar' },
			{ term: 'Paste', translation: 'Pegar', note: 'Clipboard command, not glue' },
		],
	})
})

test('context notes go stale when the English changes or a call site disappears', (t) => {
	const { root, write, readJson } = fixture(t)
	assert.equal(contextPlan(root).pending.length, 5)
	const copy = contextPlan(root).pending.find((p) => p.key === 'copy')
	recordContext(root, [
		{
			project: 'sdk',
			key: 'copy',
			sourceHash: copy.sourceHash,
			role: 'action',
			meaning: 'Copies the selected shapes to the clipboard',
			callSites: ['packages/tldraw/src/actions.ts'],
		},
	])
	assert.equal(readJson('internal/i18n/context/sdk.json').copy.role, 'action')
	assert.equal(contextPlan(root).pending.some((p) => p.key === 'copy'), false)
	assert.equal(contextPlan(root, { all: true }).pending.find((p) => p.key === 'copy').reason, 'refresh')

	rmSync(join(root, 'packages/tldraw/src/actions.ts'))
	assert.equal(contextPlan(root).pending.find((p) => p.key === 'copy').reason, 'callSiteMoved')

	write('assets/translations/main.json', { copy: 'Copy shapes', cut: 'Cut', paste: 'Paste' })
	assert.equal(contextPlan(root).pending.find((p) => p.key === 'copy').reason, 'sourceChanged')
})

test('context record refuses notes that do not match the current English', (t) => {
	const { root } = fixture(t)
	const note = {
		project: 'sdk',
		key: 'copy',
		sourceHash: 'stale',
		role: 'action',
		meaning: 'Copies shapes',
		callSites: ['packages/tldraw/src/actions.ts'],
	}
	assert.throws(() => recordContext(root, [note]), /English changed/)
	const sourceHash = contextPlan(root).pending.find((p) => p.key === 'copy').sourceHash
	assert.throws(() => recordContext(root, [{ ...note, sourceHash, role: 'button' }]), /Invalid role/)
	assert.throws(
		() => recordContext(root, [{ ...note, sourceHash, callSites: ['nope.ts'] }]),
		/Missing call site/
	)
	for (const callSite of ['/etc/passwd', '../outside.ts']) {
		assert.throws(() => recordContext(root, [{ ...note, sourceHash, callSites: [callSite] }]), /repo-relative/)
	}
	assert.equal(existsSync(join(root, 'internal/i18n/context/sdk.json')), false)
})

test('snapshot keeps English, code and context notes but no translations or glossaries', (t) => {
	const { root, write } = fixture(t)
	write('internal/i18n/glossary/es.json', { register: '', terms: [] })
	write('internal/i18n/context/sdk.json', {})
	write('internal/i18n/translation-state.json', { version: 1, entries: {} })
	write('apps/dotcom/client/public/tla/locales-compiled/es.json', {})
	write('skills/review-translations/SKILL.md', 'pl: Wróć')
	write('apps/dotcom/client/e2e/tests/homepage.spec.ts', "'Charger un média'")
	const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'ignore' })
	git('init', '-q')
	git('add', '-A')
	git('-c', 'user.name=test', '-c', 'user.email=test@example.com', 'commit', '-qm', 'fixture')

	const out = join(root, '..', `${root.split('/').pop()}-snapshot`)
	t.after(() => rmSync(out, { recursive: true, force: true }))
	snapshot(root, out)
	const has = (path) => existsSync(join(out, path))
	assert.deepEqual(
		{
			main: has('assets/translations/main.json'),
			dotcomEnglish: has('apps/dotcom/client/public/tla/locales/en.json'),
			code: has('packages/tldraw/src/actions.ts'),
			context: has('internal/i18n/context/sdk.json'),
			sdkSpanish: has('assets/translations/es.json'),
			dotcomSpanish: has('apps/dotcom/client/public/tla/locales/es.json'),
			compiled: has('apps/dotcom/client/public/tla/locales-compiled'),
			ledger: has('internal/i18n/translation-state.json'),
			glossary: has('internal/i18n/glossary'),
			examples: has('skills/review-translations') || has('apps/dotcom/client/e2e'),
		},
		{
			main: true,
			dotcomEnglish: true,
			code: true,
			context: true,
			sdkSpanish: false,
			dotcomSpanish: false,
			compiled: false,
			ledger: false,
			glossary: false,
			examples: false,
		}
	)
})

test('snapshot keeps committed glossaries when asked, and still rejects stray catalogs', (t) => {
	const { root, write } = fixture(t)
	write('internal/i18n/glossary/es.json', { register: '', terms: [] })
	const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'ignore' })
	const commit = () => {
		git('add', '-A')
		git('-c', 'user.name=test', '-c', 'user.email=test@example.com', 'commit', '-qm', 'fixture')
	}
	git('init', '-q')
	commit()

	const out = join(root, '..', `${root.split('/').pop()}-snapshot`)
	t.after(() => rmSync(out, { recursive: true, force: true }))
	snapshot(root, out, { withGlossaries: true })
	assert.equal(existsSync(join(out, 'internal/i18n/glossary/es.json')), true)
	rmSync(out, { recursive: true, force: true })

	write('docs/es.json', { copy: 'Copiar' })
	commit()
	assert.throws(() => snapshot(root, out, { withGlossaries: true }), /docs\/es\.json/)
	assert.equal(existsSync(out), false)
})

test('apply holds back entries the validator rejects and retained text that is already broken', (t) => {
	const { root, readJson } = fixture(t)
	const seen = []
	const result = apply(
		root,
		{
			entries: [
				disposition({ key: 'paste', decision: 'accept', text: '{pegar}' }),
				disposition({ key: 'copy', decision: 'retain' }),
			],
		},
		{
			validate: (_root, entries) => {
				seen.push(...entries)
				return { 'sdk:es:paste': ['unknown argument {pegar}'], 'sdk:es:copy': ['broken'] }
			},
		}
	)
	assert.deepEqual(
		seen.map((e) => e.text),
		['{pegar}', 'Copiar']
	)
	assert.equal(result.applied + result.retained, 0)
	assert.equal(result.unresolved[0].reason, 'Fails validation: unknown argument {pegar}')
	assert.equal(readJson('assets/translations/es.json').paste, undefined)
	assert.equal(plan(root, ['es']).counts.current, 0)
})

test('apply withdraws the approval of a current entry it holds back', (t) => {
	const { root } = fixture(t)
	apply(root, { entries: [disposition({ key: 'copy', decision: 'retain' })] }, valid)
	assert.equal(plan(root, ['es']).counts.current, 1)
	apply(root, { entries: [disposition({ key: 'copy', decision: 'retain', confidence: 'low' })] }, valid)
	assert.equal(plan(root, ['es']).counts.current, 0)
})

test('apply checks the glossary before writing anything', (t) => {
	const { root } = fixture(t)
	const before = readFileSync(join(root, 'assets/translations/es.json'), 'utf8')
	const entries = [disposition({ key: 'paste', decision: 'accept', text: 'Pegar' })]
	for (const [glossary, error] of [
		[{ '../../escaped': { terms: [] } }, /unsupported locale/],
		[{ es: { register: 5, terms: [] } }, /register must be a string/],
		[{ es: { terms: [{ term: 'Paste' }] } }, /needs a translation/],
	]) {
		assert.throws(() => apply(root, { entries, glossary }, valid), error)
	}
	assert.equal(readFileSync(join(root, 'assets/translations/es.json'), 'utf8'), before)
	assert.equal(existsSync(join(root, 'internal/i18n')), false)
})

test("apply keeps a catalog's existing key order", (t) => {
	const { root, write } = fixture(t)
	write('apps/dotcom/client/public/tla/locales/es.json', {
		zzz: { translation: 'Último' },
		abc: { translation: 'Abrir' },
	})
	write('apps/dotcom/client/public/tla/locales/en.json', {
		abc: { translation: 'Open' },
		def: { translation: 'Published' },
		zzz: { translation: 'Last' },
	})
	apply(
		root,
		{ entries: [disposition({ project: 'dotcom', key: 'def', decision: 'accept', text: 'Publicado' })] },
		valid
	)
	assert.deepEqual(
		Object.keys(JSON.parse(readFileSync(join(root, 'apps/dotcom/client/public/tla/locales/es.json'), 'utf8'))),
		['def', 'zzz', 'abc']
	)
})

