import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { serializeTldrawJson } from 'tldraw'
import { afterEach, describe, expect, it } from 'vitest'
import { createTuiEditor } from '../editor/createTuiEditor'
import { dragLeft, sleep, startTestApp, waitFrames, type TestApp } from './appHarness'

// Store listeners are delivered through throttleToNextFrame, which runs synchronously under
// NODE_ENV=test. Production delivers them on the next frame, after the action that reset the
// dirty flag; these tests need that ordering, so the whole file opts into the real scheduler.
;(globalThis as { __FORCE_RAF_IN_TESTS__?: boolean }).__FORCE_RAF_IN_TESTS__ = true

const CTRL_S = '\x13'
const CTRL_Q = '\x11'
const CTRL_N = '\x0e'
const CTRL_O = '\x0f'
const ENTER = '\r'
const BACKSPACE = '\x7f'

let t: TestApp | null = null

afterEach(async () => {
	if (t) {
		// Let pending frame callbacks run before the scheduler goes away: FpsScheduler is a module
		// singleton and a rAF id it never sees again would block every later flush in this worker.
		await waitFrames(t, 2)
		t.dispose()
	}
	t = null
	delete (globalThis as { __FORCE_RAF_IN_TESTS__?: boolean }).__FORCE_RAF_IN_TESTS__
})

async function fixture(dir: string): Promise<string> {
	const tui = createTuiEditor({ colorMode: 'light', cols: 100, rows: 28 })
	tui.editor.createShape({ type: 'geo', x: 100, y: 100, props: { w: 160, h: 160 } })
	const path = join(dir, 'fixture.tldr')
	writeFileSync(path, await serializeTldrawJson(tui.editor))
	tui.dispose()
	return path
}

describe('dirty tracking with deferred store listeners', () => {
	it('stays clean after ctrl+n: a new document never asks about unsaved changes', async () => {
		t = await startTestApp()
		const { ui } = t.app.getContext()
		t.fake.feed(CTRL_N)
		await waitFrames(t, 3)
		await sleep(40)
		expect(ui.dirty.get()).toBe(false)
		expect(t.fake.grid()[29]).not.toContain('untitled*')
		t.fake.feed(CTRL_Q)
		for (let i = 0; i < 50 && t.quits.length === 0; i++) await sleep(10)
		expect(t.quits).toEqual([0])
	})

	it('stays clean after ctrl+o and shows the opened file name without a dirty marker', async () => {
		t = await startTestApp()
		const { ui, editor } = t.app.getContext()
		const path = await fixture(t.dir)
		t.fake.feed(CTRL_O)
		await waitFrames(t, 2)
		t.fake.feed(path)
		t.fake.feed(ENTER)
		for (let i = 0; i < 50 && editor.getCurrentPageShapes().length === 0; i++) await sleep(10)
		await waitFrames(t, 3)
		await sleep(40)
		expect(editor.getCurrentPageShapes()).toHaveLength(1)
		expect(ui.filePath.get()).toBe(path)
		expect(ui.dirty.get()).toBe(false)
		expect(t.fake.grid()[29]).toContain('fixture.tldr')
		expect(t.fake.grid()[29]).not.toContain('fixture.tldr*')
	})

	it('keeps the document dirty when an edit lands while the file is being written', async () => {
		t = await startTestApp()
		const { ui, editor } = t.app.getContext()
		const path = join(t.dir, 'doc.tldr')
		ui.filePath.set(path)
		t.fake.feed('r')
		await waitFrames(t, 1)
		await dragLeft(t, 10, 5, 30, 15)
		expect(editor.getCurrentPageShapes()).toHaveLength(1)
		expect(ui.dirty.get()).toBe(true)
		// ctrl+s and Backspace (delete the selection) in one stdin chunk: the snapshot is taken
		// synchronously, the delete is processed before the write resolves.
		t.fake.feed(CTRL_S + BACKSPACE)
		for (let i = 0; i < 50 && !existsSync(path); i++) await sleep(10)
		await waitFrames(t, 3)
		await sleep(40)
		expect(editor.getCurrentPageShapes()).toHaveLength(0)
		const saved = JSON.parse(readFileSync(path, 'utf8')) as { records: { typeName: string }[] }
		expect(saved.records.filter((r) => r.typeName === 'shape')).toHaveLength(1)
		// The file holds a shape the editor no longer has: not clean.
		expect(ui.dirty.get()).toBe(true)
		t.fake.feed(CTRL_Q)
		await waitFrames(t, 2)
		expect(t.quits).toEqual([])
		expect(t.fake.grid()[29]).toContain('Unsaved changes')
	})
})
