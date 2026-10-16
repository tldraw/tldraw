import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createShapeId, type Editor, type TLGeoShape, type TLShapeId } from '@tldraw/editor'
import { GeoShapeGeoStyle } from '@tldraw/tlschema'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getShapePlaintext } from '../editor/richText'
import { createTestContext, type TestContext } from '../test/testContext'
import type { PromptSpec } from '../ui/UiState'
import { ACTION_IDS, type ActionId } from './actionIds'
import { isActionEnabled, performAction, runAction } from './actions'

function createGeo(editor: Editor, x: number, y: number, w = 200, h = 100): TLShapeId {
	const id = createShapeId()
	editor.createShape<TLGeoShape>({ id, type: 'geo', x, y, props: { w, h } })
	return id
}

function lastPrompt(ctx: TestContext): PromptSpec {
	const prompt = ctx.popups.lastPrompt
	expect(prompt).not.toBeNull()
	return prompt!
}

describe('every action runs without throwing', () => {
	let ctx: TestContext

	beforeAll(() => {
		ctx = createTestContext()
	})

	afterAll(() => ctx.dispose())

	function reset() {
		const { editor, ui } = ctx
		editor.complete()
		editor.setCurrentTool('select')
		ui.closePopup()
		ui.dirty.set(false)
		ui.clearLatches()
	}

	function withSelection() {
		const { editor } = ctx
		if (editor.getCurrentPageShapes().length < 3) {
			createGeo(editor, 80, 80)
			createGeo(editor, 400, 80)
			createGeo(editor, 700, 200)
		}
		editor.selectAll()
	}

	/** Runs the action; a prompt it opens is cancelled so the action settles. */
	async function run(id: ActionId) {
		const before = ctx.popups.lastPrompt
		const done = performAction(ctx, { id })
		const prompt = ctx.popups.lastPrompt
		if (prompt && prompt !== before) prompt.onCancel?.()
		await done
	}

	it.each(ACTION_IDS)('%s on an empty page', async (id) => {
		reset()
		if (ctx.editor.getCurrentPageShapes().length > 0) {
			ctx.editor.deleteShapes([...ctx.editor.getCurrentPageShapeIds()])
		}
		await run(id)
		expect(ctx.ui.error.get()).toBeNull()
		expect(() => isActionEnabled(ctx, id)).not.toThrow()
	})

	it.each(ACTION_IDS)('%s with three shapes selected', async (id) => {
		reset()
		withSelection()
		await run(id)
		expect(ctx.ui.error.get()).toBeNull()
		expect(() => isActionEnabled(ctx, id)).not.toThrow()
	})
})

describe('actions', () => {
	let ctx: TestContext
	let editor: Editor

	beforeEach(() => {
		ctx = createTestContext()
		editor = ctx.editor
	})

	afterEach(() => ctx.dispose())

	it('reports enablement from editor state', () => {
		expect(isActionEnabled(ctx, 'edit.undo')).toBe(false)
		expect(isActionEnabled(ctx, 'edit.delete')).toBe(false)
		expect(isActionEnabled(ctx, 'edit.select-all')).toBe(false)
		expect(isActionEnabled(ctx, 'page.delete')).toBe(false)
		expect(isActionEnabled(ctx, 'page.prev')).toBe(false)
		expect(isActionEnabled(ctx, 'page.next')).toBe(false)
		expect(isActionEnabled(ctx, 'tool.hand')).toBe(true)
		const a = createGeo(editor, 80, 80)
		const b = createGeo(editor, 400, 80)
		expect(isActionEnabled(ctx, 'edit.select-all')).toBe(true)
		editor.select(a)
		expect(isActionEnabled(ctx, 'edit.delete')).toBe(true)
		expect(isActionEnabled(ctx, 'arrange.align-left')).toBe(false)
		expect(isActionEnabled(ctx, 'arrange.flip-horizontal')).toBe(true)
		expect(isActionEnabled(ctx, 'edit.toggle-group')).toBe(false)
		editor.select(a, b)
		expect(isActionEnabled(ctx, 'arrange.align-left')).toBe(true)
		expect(isActionEnabled(ctx, 'arrange.distribute-horizontal')).toBe(false)
		expect(isActionEnabled(ctx, 'edit.toggle-group')).toBe(true)
		expect(isActionEnabled(ctx, 'edit.paste')).toBe(false)
		ctx.clipboard.content = editor.getContentFromCurrentPage([a]) ?? null
		expect(isActionEnabled(ctx, 'edit.paste')).toBe(true)
	})

	it('copies, cuts and pastes through the app clipboard', () => {
		const a = createGeo(editor, 80, 80)
		editor.select(a)
		runAction(ctx, { id: 'edit.copy' })
		expect(ctx.clipboard.content?.shapes).toHaveLength(1)
		runAction(ctx, { id: 'edit.paste' })
		expect(editor.getCurrentPageShapes()).toHaveLength(2)
		expect(editor.getSelectedShapeIds()).toHaveLength(1)
		expect(editor.getSelectedShapeIds()[0]).not.toBe(a)
		runAction(ctx, { id: 'edit.cut' })
		expect(editor.getCurrentPageShapes()).toHaveLength(1)
		runAction(ctx, { id: 'edit.undo' })
		expect(editor.getCurrentPageShapes()).toHaveLength(2)
	})

	it('pastes at the pointer when shift is latched', () => {
		const a = createGeo(editor, 80, 80)
		editor.select(a)
		runAction(ctx, { id: 'edit.copy' })
		editor.dispatch({
			type: 'pointer',
			name: 'pointer_move',
			point: { x: 500, y: 300 },
			pointerId: 1,
			button: 0,
			isPen: false,
			target: 'canvas',
			shiftKey: false,
			altKey: false,
			ctrlKey: false,
			metaKey: false,
			accelKey: false,
		})
		editor.emit('tick', 16)
		ctx.ui.toggleLatch('shift')
		runAction(ctx, { id: 'edit.paste' })
		const pasted = editor.getSelectedShapes()[0]
		const bounds = editor.getShapePageBounds(pasted)!
		expect(bounds.center.x).toBeCloseTo(500, 5)
		expect(bounds.center.y).toBeCloseTo(300, 5)
	})

	it('duplicates, groups, locks and arranges', () => {
		const a = createGeo(editor, 80, 80)
		const b = createGeo(editor, 400, 200)
		editor.select(a)
		runAction(ctx, { id: 'edit.duplicate' })
		expect(editor.getCurrentPageShapes()).toHaveLength(3)
		const dup = editor.getSelectedShapes()[0]
		expect(editor.getShapePageBounds(dup)!.x).toBeGreaterThan(280)

		editor.select(a, b)
		runAction(ctx, { id: 'arrange.align-top' })
		expect(editor.getShapePageBounds(b)!.y).toBe(80)
		runAction(ctx, { id: 'edit.group' })
		expect(editor.getSelectedShapes()[0].type).toBe('group')
		runAction(ctx, { id: 'edit.toggle-group' })
		expect([...editor.getSelectedShapeIds()].sort()).toEqual([a, b].sort())
		runAction(ctx, { id: 'edit.toggle-group' })
		expect(editor.getSelectedShapes()[0].type).toBe('group')
		runAction(ctx, { id: 'edit.ungroup' })
		expect(editor.getCurrentPageShapes().some((s) => s.type === 'group')).toBe(false)

		editor.select(a)
		runAction(ctx, { id: 'edit.toggle-lock' })
		expect(editor.getShape(a)!.isLocked).toBe(true)
		expect(isActionEnabled(ctx, 'edit.unlock-all')).toBe(true)
		runAction(ctx, { id: 'edit.unlock-all' })
		expect(editor.getShape(a)!.isLocked).toBe(false)

		editor.select(a)
		runAction(ctx, { id: 'arrange.rotate-cw' })
		expect(editor.getShape(a)!.rotation).toBeCloseTo(Math.PI / 12, 5)
		runAction(ctx, { id: 'arrange.rotate-ccw' })
		expect(editor.getShape(a)!.rotation).toBeCloseTo(0, 5)
		runAction(ctx, { id: 'arrange.bring-to-front' })
		expect(editor.getCurrentPageShapesSorted().at(-1)!.id).toBe(a)
		runAction(ctx, { id: 'arrange.send-to-back' })
		expect(editor.getCurrentPageShapesSorted()[0].id).toBe(a)
	})

	it('changes view state', () => {
		runAction(ctx, { id: 'view.zoom-in' })
		expect(editor.getZoomLevel()).toBe(2)
		runAction(ctx, { id: 'view.zoom-to-100' })
		expect(editor.getZoomLevel()).toBe(1)
		runAction(ctx, { id: 'view.zoom-out' })
		expect(editor.getZoomLevel()).toBe(0.5)
		createGeo(editor, 80, 80)
		runAction(ctx, { id: 'view.zoom-to-fit' })
		expect(editor.getZoomLevel()).toBeGreaterThan(0.5)
		runAction(ctx, { id: 'view.toggle-grid' })
		expect(editor.getInstanceState().isGridMode).toBe(true)
		runAction(ctx, { id: 'view.toggle-snap' })
		expect(editor.user.getIsSnapMode()).toBe(true)
		runAction(ctx, { id: 'view.toggle-dark-mode' })
		expect(ctx.colorModes).toEqual(['dark'])
		runAction(ctx, { id: 'view.toggle-dark-mode' })
		expect(ctx.colorModes).toEqual(['dark', 'light'])
		runAction(ctx, { id: 'view.toggle-debug' })
		expect(ctx.ui.debug.get()).toBe(true)
		runAction(ctx, { id: 'view.toggle-pointer-mode' })
		expect(ctx.ui.pointerMode.get()).toBe(true)
		expect(ctx.ui.pointerCell.get()).toEqual({ col: 50, row: 15 })
		runAction(ctx, { id: 'view.toggle-style-panel' })
		expect(ctx.ui.stylePanelOpen.get()).toBe(false)
	})

	it('selects tools and geo shapes', () => {
		runAction(ctx, { id: 'tool.text' })
		expect(editor.getCurrentToolId()).toBe('text')
		runAction(ctx, { id: 'tool.geo', arg: 'star' })
		expect(editor.getCurrentToolId()).toBe('geo')
		expect(editor.getStyleForNextShape(GeoShapeGeoStyle)).toBe('star')
		runAction(ctx, { id: 'tool.geo', arg: 'not-a-shape' })
		expect(editor.getStyleForNextShape(GeoShapeGeoStyle)).toBe('star')
		runAction(ctx, { id: 'tool.ellipse' })
		expect(editor.getStyleForNextShape(GeoShapeGeoStyle)).toBe('ellipse')
		runAction(ctx, { id: 'tool.select' })
		expect(editor.getCurrentToolId()).toBe('select')
	})

	it('starts editing text from the edit-text action', () => {
		const a = createGeo(editor, 80, 80)
		editor.select(a)
		runAction(ctx, { id: 'edit.edit-text' })
		expect(editor.getEditingShapeId()).toBe(a)
		expect(editor.isIn('select.editing_shape')).toBe(true)
	})

	it('manages pages', async () => {
		runAction(ctx, { id: 'page.new' })
		expect(editor.getPages()).toHaveLength(2)
		const second = editor.getCurrentPageId()
		expect(second).toBe(editor.getPages()[1].id)
		runAction(ctx, { id: 'page.prev' })
		expect(editor.getCurrentPageId()).toBe(editor.getPages()[0].id)
		runAction(ctx, { id: 'page.next' })
		expect(editor.getCurrentPageId()).toBe(second)
		runAction(ctx, { id: 'page.next' })
		expect(editor.getCurrentPageId()).toBe(second)
		runAction(ctx, { id: 'page.switch', arg: editor.getPages()[0].id })
		expect(editor.getCurrentPageId()).toBe(editor.getPages()[0].id)

		const renamed = performAction(ctx, { id: 'page.rename' })
		const prompt = lastPrompt(ctx)
		expect(prompt.kind).toBe('text')
		expect(prompt.initial).toBe(editor.getCurrentPage().name)
		await prompt.onSubmit('Overview')
		await renamed
		expect(editor.getCurrentPage().name).toBe('Overview')

		runAction(ctx, { id: 'page.duplicate' })
		expect(editor.getPages()).toHaveLength(3)
		runAction(ctx, { id: 'page.delete' })
		expect(editor.getPages()).toHaveLength(2)
	})

	it('opens popups and toggles latches', () => {
		runAction(ctx, { id: 'ui.menu' })
		runAction(ctx, { id: 'ui.help' })
		runAction(ctx, { id: 'ui.pages' })
		runAction(ctx, { id: 'ui.geo-picker' })
		runAction(ctx, { id: 'ui.style-panel' })
		ctx.ui.pointerCell.set({ col: 7, row: 9 })
		runAction(ctx, { id: 'ui.context-menu' })
		expect(ctx.popups.calls.map((c) => c.method)).toEqual([
			'openMenu',
			'openHelp',
			'openPages',
			'openGeoPicker',
			'openStylePanel',
			'openContextMenu',
		])
		expect(ctx.popups.calls.at(-1)!.args).toEqual([7, 9])
		runAction(ctx, { id: 'modifier.toggle-alt' })
		expect(ctx.ui.latches.get().alt).toBe(true)
		runAction(ctx, { id: 'modifier.toggle-alt' })
		expect(ctx.ui.latches.get().stickyAlt).toBe(true)
		runAction(ctx, { id: 'modifier.toggle-alt' })
		expect(ctx.ui.latches.get().alt).toBe(false)
	})

	it('hides a docked style panel and docks it again on a wide terminal', () => {
		ctx.layout = { ...ctx.layout, cols: 140, stylePanel: { x: 122, y: 1, w: 18, h: 28 } }
		runAction(ctx, { id: 'ui.style-panel' })
		expect(ctx.ui.stylePanelOpen.get()).toBe(false)
		ctx.layout = { ...ctx.layout, stylePanel: null }
		editor.select(createGeo(editor, 80, 80))
		runAction(ctx, { id: 'ui.style-panel' })
		expect(ctx.ui.stylePanelOpen.get()).toBe(true)
		expect(ctx.popups.calls).toHaveLength(0)
		editor.selectNone()
		ctx.ui.stylePanelOpen.set(false)
		runAction(ctx, { id: 'ui.style-panel' })
		expect(ctx.popups.calls.map((c) => c.method)).toEqual(['openStylePanel'])
	})
})

describe('file actions', () => {
	let dir: string
	let ctx: TestContext

	beforeAll(async () => {
		dir = await mkdtemp(join(tmpdir(), 'tui-actions-'))
	})

	afterAll(async () => {
		await rm(dir, { recursive: true, force: true })
	})

	beforeEach(() => {
		ctx = createTestContext()
	})

	afterEach(() => ctx.dispose())

	it('saves through a path prompt, then saves silently, and opens the file again', async () => {
		const { editor } = ctx
		createGeo(editor, 80, 80)
		ctx.ui.dirty.set(true)
		const path = join(dir, 'drawing.tldr')

		const saving = performAction(ctx, { id: 'file.save' })
		const prompt = lastPrompt(ctx)
		expect(prompt.kind).toBe('path')
		expect(prompt.label).toBe('Save as: ')
		await prompt.onSubmit(path)
		await saving
		expect((await stat(path)).size).toBeGreaterThan(0)
		expect(ctx.ui.filePath.get()).toBe(path)
		expect(ctx.ui.dirty.get()).toBe(false)
		expect(ctx.ui.hint.get()).toBe(`Saved ${path}`)

		ctx.popups.calls = []
		createGeo(editor, 400, 80)
		await performAction(ctx, { id: 'file.save' })
		expect(ctx.popups.calls).toHaveLength(0)
		expect(
			JSON.parse(await readFile(path, 'utf8')).records.filter(
				(r: { typeName: string }) => r.typeName === 'shape'
			)
		).toHaveLength(2)

		const other = createTestContext()
		try {
			const opening = performAction(other, { id: 'file.open' })
			const openPrompt = lastPrompt(other)
			expect(openPrompt.label).toBe('Open: ')
			await openPrompt.onSubmit(path)
			await opening
			expect(other.editor.getCurrentPageShapes()).toHaveLength(2)
			expect(other.ui.filePath.get()).toBe(path)
			expect(other.ui.dirty.get()).toBe(false)
		} finally {
			other.dispose()
		}
	})

	it('save as prompts with the current path and reports write errors', async () => {
		ctx.ui.filePath.set(join(dir, 'a.tldr'))
		const saving = performAction(ctx, { id: 'file.save-as' })
		const prompt = lastPrompt(ctx)
		expect(prompt.initial).toBe(join(dir, 'a.tldr'))
		await prompt.onSubmit(join(dir, 'b.tldr'))
		await saving
		expect(ctx.ui.filePath.get()).toBe(join(dir, 'b.tldr'))

		const failing = performAction(ctx, { id: 'file.save-as' })
		await lastPrompt(ctx).onSubmit(join(dir, 'b.tldr', 'nested', 'c.tldr'))
		await failing
		expect(ctx.ui.error.get()?.message).toMatch(/Could not save/)
		expect(ctx.ui.filePath.get()).toBe(join(dir, 'b.tldr'))
	})

	it('reports an unreadable file on open', async () => {
		const opening = performAction(ctx, { id: 'file.open' })
		await lastPrompt(ctx).onSubmit(join(dir, 'missing.tldr'))
		await opening
		expect(ctx.ui.error.get()?.message).toMatch(/Could not read/)
	})

	it('exports the rendered text to a file', async () => {
		ctx.renderToText = () => 'ABC'
		createGeo(ctx.editor, 80, 80)
		const path = join(dir, 'out.txt')
		const exporting = performAction(ctx, { id: 'file.export-text' })
		const prompt = lastPrompt(ctx)
		expect(prompt.label).toBe('Export as text: ')
		await prompt.onSubmit(path)
		await exporting
		expect(await readFile(path, 'utf8')).toBe('ABC\n')
		expect(ctx.ui.hint.get()).toBe(`Exported ${path}`)
	})

	it('asks to confirm before quitting, opening or starting new with unsaved changes', async () => {
		ctx.ui.dirty.set(true)
		const quitting = performAction(ctx, { id: 'app.quit' })
		const prompt = lastPrompt(ctx)
		expect(prompt.kind).toBe('confirm')
		expect(prompt.label).toBe('Unsaved changes — save? (y/n/esc)')
		expect(prompt.choices?.map((c) => c.key)).toEqual(['y', 'n'])
		prompt.onCancel?.()
		await quitting
		expect(ctx.quits).toBe(0)

		const quitting2 = performAction(ctx, { id: 'app.quit' })
		await lastPrompt(ctx).onSubmit('n')
		await quitting2
		expect(ctx.quits).toBe(1)

		// Saving first: the confirm leads to a path prompt, then the quit.
		const quitting3 = performAction(ctx, { id: 'app.quit' })
		const confirm = lastPrompt(ctx)
		const submitted = confirm.onSubmit('y')
		const pathPrompt = lastPrompt(ctx)
		expect(pathPrompt.kind).toBe('path')
		const path = join(dir, 'quit.tldr')
		await pathPrompt.onSubmit(path)
		await submitted
		await quitting3
		expect(ctx.quits).toBe(2)
		expect((await stat(path)).size).toBeGreaterThan(0)
		expect(ctx.ui.dirty.get()).toBe(false)

		ctx.ui.dirty.set(false)
		await performAction(ctx, { id: 'app.quit' })
		expect(ctx.quits).toBe(3)
	})

	it('starts a new empty document', async () => {
		const { editor } = ctx
		createGeo(editor, 80, 80)
		runAction(ctx, { id: 'page.new' })
		ctx.ui.filePath.set(join(dir, 'x.tldr'))
		editor.setCamera({ x: 100, y: 50, z: 2 }, { immediate: true })
		await performAction(ctx, { id: 'file.new' })
		expect(editor.getPages()).toHaveLength(1)
		expect(editor.getCurrentPageShapes()).toHaveLength(0)
		expect(editor.getCanUndo()).toBe(false)
		expect(ctx.ui.filePath.get()).toBeNull()
		expect(editor.getZoomLevel()).toBe(1)
		// The editor keeps working afterwards.
		const id = createGeo(editor, 10, 10)
		expect(getShapePlaintext(editor, editor.getShape(id)!)).toBe('')
		expect(editor.getCurrentPageShapes()).toHaveLength(1)
	})
})
