import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { invalidate, plan, record, statePath } from './translation-state.mjs'

function fixture(t) {
	const root = mkdtempSync(join(tmpdir(), 'translation-state-test-'))
	t.after(() => rmSync(root, { recursive: true, force: true }))
	const write = (path, value) => {
		mkdirSync(dirname(join(root, path)), { recursive: true })
		writeFileSync(join(root, path), JSON.stringify(value))
	}
	write('assets/translations/languages.json', [
		{ locale: 'en' },
		{ locale: 'es' },
		{ locale: 'fr' },
	])
	write('assets/translations/main.json', { copy: 'Copy', paste: 'Paste' })
	write('assets/translations/es.json', { copy: 'Copiar', legacy: 'Conservar' })
	write('apps/dotcom/client/public/tla/locales/en.json', {
		abc: { translation: 'Open', notes: 'Open a file' },
	})
	write('apps/dotcom/client/public/tla/locales/es.json', { abc: { translation: 'Abrir' } })
	return { root, write }
}

const find = (p, key) => p.entries.find((entry) => entry.locale === 'es' && entry.key === key)

test('bootstrap preserves existing text, separates unknown and missing, and reports obsolete keys', (t) => {
	const { root } = fixture(t)
	const before = readFileSync(join(root, 'assets/translations/es.json'), 'utf8')
	const p = plan(root, ['es'])
	assert.deepEqual(p.counts, {
		current: 0,
		missing: 1,
		unverified: 2,
		sourceChanged: 0,
		translationChanged: 0,
	})
	assert.deepEqual(p.obsolete, [{ project: 'sdk', locale: 'es', key: 'legacy' }])
	assert.equal(find(p, 'copy').translation, 'Copiar')
	assert.equal(find(p, 'paste').reason, 'missing')
	assert.equal(readFileSync(join(root, 'assets/translations/es.json'), 'utf8'), before)
	assert.equal(plan(root).entries.filter((e) => e.locale === 'fr').length, 3)
	assert.throws(() => plan(root, ['en']), /Unsupported locale/)
})

test('records only reviewed entries, detects source and external target changes, and keeps other locales pending', (t) => {
	const { root, write } = fixture(t)
	record(root, [find(plan(root, ['es']), 'copy')])
	assert.equal(plan(root, ['es']).counts.current, 1)
	assert.equal(plan(root, ['fr']).counts.missing, 3)
	write('assets/translations/main.json', { copy: 'Copy selection', paste: 'Paste' })
	assert.equal(find(plan(root, ['es']), 'copy').reason, 'sourceChanged')
	record(root, [find(plan(root, ['es']), 'copy')])
	write('assets/translations/es.json', { copy: 'Copiar selección', legacy: 'Conservar' })
	assert.equal(find(plan(root, ['es']), 'copy').reason, 'translationChanged')
})

test('rejects stale or empty approvals without partially advancing the ledger', (t) => {
	const { root, write } = fixture(t)
	record(root, [find(plan(root, ['es']), 'copy')])
	const previous = readFileSync(join(root, statePath), 'utf8')
	const p = plan(root, ['es'])
	assert.throws(
		() => record(root, [find(p, 'abc'), find(p, 'paste')]),
		/No translated source entry/
	)
	assert.equal(readFileSync(join(root, statePath), 'utf8'), previous)
	const approved = find(p, 'abc')
	write('apps/dotcom/client/public/tla/locales/en.json', {
		abc: { translation: 'Open', notes: 'Open a workspace' },
	})
	assert.throws(() => record(root, [approved]), /changed since review/)
	assert.equal(readFileSync(join(root, statePath), 'utf8'), previous)
	assert.throws(() => record(root, []), /nonempty/)
	const current = find(plan(root, ['es']), 'abc')
	assert.throws(() => record(root, [current, current]), /Duplicate approval/)
})

test('a changed website hash ID is new work without deleting its old translation', (t) => {
	const { root, write } = fixture(t)
	record(root, [find(plan(root, ['es']), 'abc')])
	write('apps/dotcom/client/public/tla/locales/en.json', { def: { translation: 'Open file' } })
	const p = plan(root, ['es'])
	assert.equal(find(p, 'def').reason, 'missing')
	assert.ok(p.obsolete.some((e) => e.key === 'abc'))
	assert.equal(
		JSON.parse(readFileSync(join(root, 'apps/dotcom/client/public/tla/locales/es.json'))).abc
			.translation,
		'Abrir'
	)
})

test('reports unsupported locale files without changing or translating them', (t) => {
	const { root, write } = fixture(t)
	write('assets/translations/zz.json', { copy: 'Preserve me' })
	write('apps/dotcom/client/public/tla/locales/zz.json', { abc: { translation: 'Keep me' } })
	write('assets/translations/xx-AE.json', {})
	const p = plan(root, ['es'])
	assert.deepEqual(p.unsupported, [
		{ project: 'sdk', locale: 'zz', targetPath: 'assets/translations/zz.json' },
		{
			project: 'dotcom',
			locale: 'zz',
			targetPath: 'apps/dotcom/client/public/tla/locales/zz.json',
		},
	])
	assert.ok(p.entries.every((entry) => entry.locale === 'es'))
	assert.equal(
		JSON.parse(readFileSync(join(root, 'assets/translations/zz.json'))).copy,
		'Preserve me'
	)
})

test('full review includes current entries without resetting state and can retain them', (t) => {
	const { root } = fixture(t)
	record(root, [find(plan(root, ['es']), 'copy')])
	const before = readFileSync(join(root, statePath), 'utf8')
	assert.equal(find(plan(root, ['es']), 'copy'), undefined)
	const full = plan(root, ['es'], { includeCurrent: true })
	assert.equal(full.entries.length, 3)
	assert.equal(find(full, 'copy').reason, 'current')
	assert.equal(readFileSync(join(root, statePath), 'utf8'), before)
	record(root, [find(full, 'copy')])
	assert.equal(readFileSync(join(root, statePath), 'utf8'), before)
	assert.equal(plan(root, ['es']).counts.current, 1)
})

test('full review approvals still reject edits made after review', (t) => {
	const { root, write } = fixture(t)
	record(root, [find(plan(root, ['es']), 'copy')])
	const approved = find(plan(root, ['es'], { includeCurrent: true }), 'copy')
	write('assets/translations/es.json', { copy: 'New unreviewed wording' })
	assert.throws(() => record(root, [approved]), /changed since review/)
	assert.equal(find(plan(root, ['es']), 'copy').reason, 'translationChanged')
})

test('invalidating an unresolved review exposes only that key to later incremental runs', (t) => {
	const { root, write } = fixture(t)
	record(root, [find(plan(root, ['es']), 'copy'), find(plan(root, ['es']), 'abc')])
	const unresolved = find(plan(root, ['es'], { includeCurrent: true }), 'copy')
	const before = readFileSync(join(root, 'assets/translations/es.json'), 'utf8')
	invalidate(root, [unresolved])
	assert.equal(find(plan(root, ['es']), 'copy').reason, 'unverified')
	assert.equal(find(plan(root, ['es']), 'abc'), undefined)
	assert.equal(readFileSync(join(root, 'assets/translations/es.json'), 'utf8'), before)
	const approved = find(plan(root, ['es'], { includeCurrent: true }), 'abc')
	write('apps/dotcom/client/public/tla/locales/es.json', {
		abc: { translation: 'Changed externally' },
	})
	const state = readFileSync(join(root, statePath), 'utf8')
	assert.throws(() => invalidate(root, [approved]), /changed since review/)
	assert.equal(readFileSync(join(root, statePath), 'utf8'), state)
})
