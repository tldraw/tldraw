import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { TLGeoShape } from '@tldraw/editor'
import { renderPlaintextFromRichText } from 'tldraw'
import { afterEach, describe, expect, it } from 'vitest'
import { CELL_H, CELL_W } from '../editor/constants'
import {
	dragLeft,
	gridText,
	sgrMouse,
	sleep,
	startTestApp,
	waitFrames,
	type TestApp,
} from './appHarness'

const CTRL_Z = '\x1a'
const CTRL_S = '\x13'
const CTRL_Q = '\x11'
const ESC = '\x1b'
const ENTER = '\r'

let t: TestApp | null = null

afterEach(() => {
	t?.dispose()
	t = null
})

async function drawRect(app: TestApp, col0 = 10, row0 = 5, col1 = 30, row1 = 15) {
	app.fake.feed('r')
	await waitFrames(app, 1)
	await dragLeft(app, col0, row0, col1, row1)
}

function boxRow(app: TestApp, row: number, col0: number, col1: number): string {
	return app.fake.grid()[row].slice(col0, col1 + 1)
}

describe('App end to end', () => {
	it('paints the toolbar and the status bar on start', async () => {
		t = await startTestApp()
		const grid = t.fake.grid()
		expect(grid).toHaveLength(30)
		expect(grid[0]).toMatch(/v sel|v select/)
		expect(grid[0]).toMatch(/h hnd|h hand/)
		expect(grid[29]).toContain('Select')
		expect(grid[29]).toContain('untitled')
		expect(grid[29]).toContain('100%')
		// The first paint is a full frame wrapped in synchronized output.
		expect(t.fake.getOutput()).toContain('\x1b[?2026h')
		expect(t.app.getContext().ui.keyboardEncoding.get()).toBe('full')
	})

	it('creates a rectangle from r plus an SGR mouse drag and draws it with box glyphs', async () => {
		t = await startTestApp()
		const { editor } = t.app.getContext()
		await drawRect(t)
		const shapes = editor.getCurrentPageShapes()
		expect(shapes).toHaveLength(1)
		expect(shapes[0].type).toBe('geo')
		expect((shapes[0] as TLGeoShape).props.geo).toBe('rectangle')
		const bounds = editor.getShapePageBounds(shapes[0])!
		// Cell centres: (10.5, 4.5) to (30.5, 14.5) canvas cells at 8 × 16 px.
		expect(bounds.x).toBeCloseTo(10.5 * CELL_W)
		expect(bounds.y).toBeCloseTo(4.5 * CELL_H)
		expect(bounds.w).toBeCloseTo(20 * CELL_W)
		expect(bounds.h).toBeCloseTo(10 * CELL_H)

		const top = boxRow(t, 5, 11, 29)
		expect(top.replace(/[─━]/g, '')).toBe('')
		const bottom = boxRow(t, 15, 11, 29)
		expect(bottom.replace(/[─━]/g, '')).toBe('')
		const grid = t.fake.grid()
		for (let row = 6; row <= 14; row++) {
			expect(['│', '┃']).toContain(grid[row][10])
			expect(['│', '┃']).toContain(grid[row][30])
		}
		// Created shapes are selected: the status bar says so.
		expect(grid[29]).toContain('1 selected')
	})

	it('removes the rectangle and its glyphs on ctrl+z', async () => {
		t = await startTestApp()
		const { editor } = t.app.getContext()
		await drawRect(t)
		expect(editor.getCurrentPageShapes()).toHaveLength(1)
		t.fake.feed(CTRL_Z)
		await waitFrames(t, 2)
		expect(editor.getCurrentPageShapes()).toHaveLength(0)
		const grid = t.fake.grid()
		for (let row = 5; row <= 15; row++) {
			// The pointer still sits at (30, 15) showing the resize cursor glyph tldraw last set.
			const cells = row === 15 ? grid[row].slice(10, 30) : grid[row].slice(10, 31)
			expect(cells.trim()).toBe('')
		}
	})

	it('treats a lone ESC chunk as Escape and returns to the select tool', async () => {
		t = await startTestApp()
		const { editor } = t.app.getContext()
		t.fake.feed('r')
		await waitFrames(t, 1)
		expect(editor.getCurrentToolId()).toBe('geo')
		t.fake.feed(ESC)
		// Synchronous: no timer is involved for a chunk that is exactly ESC.
		expect(editor.getCurrentToolId()).toBe('select')
		await waitFrames(t, 1)
		expect(t.fake.grid()[29]).toContain('Select')
	})

	it('opens the menu on m and closes it on Esc', async () => {
		t = await startTestApp()
		const { ui } = t.app.getContext()
		t.fake.feed('m')
		await waitFrames(t, 2)
		expect(ui.popup.get()?.kind).toBe('menu')
		const menubar = t.fake.grid()[1]
		expect(menubar).toContain('File')
		expect(menubar).toContain('Edit')
		expect(menubar).toContain('View')
		t.fake.feed(ESC)
		await waitFrames(t, 2)
		expect(ui.popup.get()).toBeNull()
		expect(t.fake.grid()[1]).not.toContain('File')
	})

	it('edits text with Enter, typing and Esc', async () => {
		t = await startTestApp()
		const { editor } = t.app.getContext()
		await drawRect(t)
		// The new rectangle is selected; Enter starts editing it (a click inside the label would too).
		const shape = editor.getCurrentPageShapes()[0] as TLGeoShape
		expect(editor.getSelectedShapeIds()).toEqual([shape.id])
		t.fake.feed(ENTER)
		await waitFrames(t, 1)
		expect(editor.getEditingShapeId()).toBe(shape.id)
		t.fake.feed('hi')
		await waitFrames(t, 2)
		// The real cursor sits on the caret while editing.
		expect(t.fake.getOutput()).toContain('\x1b[?25h')
		t.fake.feed(ESC)
		await waitFrames(t, 2)
		expect(editor.getEditingShapeId()).toBeNull()
		const after = editor.getShape<TLGeoShape>(shape.id)!
		expect(renderPlaintextFromRichText(editor, after.props.richText)).toBe('hi')
		const grid = t.fake.grid()
		const inside = grid.slice(6, 15).map((row) => row.slice(11, 30))
		expect(inside.some((row) => row.includes('hi'))).toBe(true)
	})

	it('saves to a typed path from the ctrl+s prompt', async () => {
		t = await startTestApp()
		const { ui, editor } = t.app.getContext()
		await drawRect(t)
		t.fake.feed(CTRL_S)
		await waitFrames(t, 2)
		expect(ui.popup.get()?.kind).toBe('prompt')
		expect(t.fake.grid()[29]).toContain('Save as:')
		const path = join(t.dir, 'drawing.tldr')
		t.fake.feed(path)
		await waitFrames(t, 2)
		expect(t.fake.grid()[29]).toContain('drawing.tldr')
		t.fake.feed(ENTER)
		for (let i = 0; i < 50 && !existsSync(path); i++) await sleep(10)
		expect(existsSync(path)).toBe(true)
		const json = JSON.parse(readFileSync(path, 'utf8'))
		expect(json.tldrawFileFormatVersion).toBeGreaterThan(0)
		expect(json.records.some((r: { typeName: string }) => r.typeName === 'shape')).toBe(true)
		await waitFrames(t, 2)
		expect(ui.filePath.get()).toBe(path)
		expect(ui.dirty.get()).toBe(false)
		expect(editor.getCurrentPageShapes()).toHaveLength(1)
		expect(t.fake.grid()[29]).toContain('drawing.tldr')
	})

	it('repaints fully and resizes the viewport when the terminal changes size', async () => {
		t = await startTestApp()
		const { editor } = t.app.getContext()
		expect(editor.getViewportScreenBounds().w).toBe(100 * CELL_W)
		expect(editor.getViewportScreenBounds().h).toBe(28 * CELL_H)
		await waitFrames(t, 2)
		t.fake.clearWrites()
		t.fake.resize(120, 40)
		await waitFrames(t, 2)
		const bounds = editor.getViewportScreenBounds()
		expect(bounds.w).toBe(120 * CELL_W)
		expect(bounds.h).toBe(38 * CELL_H)
		const grid = t.fake.grid()
		expect(grid).toHaveLength(40)
		expect(grid[0]).toMatch(/v select/)
		expect(grid[39]).toContain('Select')
		// A full repaint addresses the new last row and the toolbar.
		const out = t.fake.getOutput()
		expect(out).toContain('\x1b[40;')
		expect(out).toContain('\x1b[1;1H')
		expect(t.app.getLayout().canvas).toEqual({ x: 0, y: 1, w: 120, h: 38 })
	})

	it('asks before quitting a dirty document and quits on n', async () => {
		t = await startTestApp()
		const { ui } = t.app.getContext()
		await drawRect(t)
		expect(ui.dirty.get()).toBe(true)
		t.fake.feed(CTRL_Q)
		await waitFrames(t, 2)
		expect(t.quits).toEqual([])
		expect(ui.popup.get()?.kind).toBe('prompt')
		expect(t.fake.grid()[29]).toContain('Unsaved changes')
		t.fake.feed('n')
		for (let i = 0; i < 50 && t.quits.length === 0; i++) await sleep(10)
		expect(t.quits).toEqual([0])
		const output = t.fake.getOutput()
		expect(output.endsWith('\x1b[?1049l')).toBe(true)
		expect(t.fake.input.rawMode).toBe(false)
	})

	it('shows the fps field in the status row with debug on', async () => {
		t = await startTestApp({ app: { debug: true } })
		expect(t.fake.grid()[29]).toMatch(/\dfps/)
		// Stats refresh at most four times a second while frames run.
		const ui = t.app.getContext().ui
		const seen = new Set<object>()
		const start = performance.now()
		while (performance.now() - start < 600) {
			t.fake.feed(sgrMouse('move', 20 + (seen.size % 5), 10))
			await sleep(5)
			if (ui.debugStats) seen.add(ui.debugStats)
		}
		expect(seen.size).toBeGreaterThanOrEqual(2)
		expect(seen.size).toBeLessThanOrEqual(4)
		expect(gridText(t)).toMatch(/\dfps/)
	})
})
