import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createShapeId } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PopupController } from '../app/context'
import { layoutChrome, renderChrome, snapshotUi } from '../render/renderChrome'
import { codeForKey, type KeyEvent, type MouseEvent } from '../terminal/InputParser'
import { Screen } from '../terminal/Screen'
import { createTestContext, type TestContext } from '../test/testContext'
import { buildPopupModel, createPopupController, type PopupModel } from './popups'

const COLS = 100
const ROWS = 30

function key(name: string, mods: Partial<KeyEvent> = {}): KeyEvent {
	const printable = name.length === 1 && !mods.ctrl && !mods.alt
	return {
		type: 'key',
		key: name,
		code: codeForKey(name),
		shift: false,
		ctrl: false,
		alt: false,
		meta: false,
		...(printable ? { text: name } : {}),
		...mods,
	}
}

function mouse(
	action: MouseEvent['action'],
	col: number,
	row: number,
	button: MouseEvent['button'] = 0
): MouseEvent {
	return {
		type: 'mouse',
		action,
		button,
		col,
		row,
		dx: 0,
		dy: action === 'wheel' ? 1 : 0,
		shift: false,
		ctrl: false,
		alt: false,
	}
}

function addRect(ctx: TestContext, x = 0, y = 0) {
	const id = createShapeId()
	ctx.editor.createShape({ id, type: 'geo', x, y, props: { w: 100, h: 100 } })
	return id
}

describe('popup controller', () => {
	let ctx: TestContext
	let popups: PopupController

	function model(): PopupModel {
		return buildPopupModel(ctx.ui.popup.get()!, {
			cols: COLS,
			rows: ROWS,
			editor: ctx.editor,
			ui: ctx.ui,
			encoding: ctx.ui.keyboardEncoding.get(),
			env: ctx.env,
			glyphs: ctx.glyphs,
		})
	}

	function render() {
		const layout = ctx.getLayout()
		const screen = new Screen(layout.cols, layout.rows)
		ctx.hotRegions = renderChrome(screen, layout, {
			editor: ctx.editor,
			ui: ctx.ui,
			glyphs: ctx.glyphs,
			colorMode: 'light',
			capabilities: ctx.capabilities,
			filePath: null,
			dirty: false,
			debugStats: null,
			now: 0,
			env: ctx.env,
		})
		return screen
	}

	beforeEach(() => {
		ctx = createTestContext({ cols: COLS, rows: ROWS })
		// The App publishes the layout of the last frame; here it follows the UI state directly.
		ctx.getLayout = () => layoutChrome(COLS, ROWS, snapshotUi(ctx.ui), ctx.editor)
		popups = createPopupController(ctx)
	})
	afterEach(() => ctx.dispose())

	describe('without a popup', () => {
		it('does not consume keys or canvas clicks', () => {
			expect(popups.handleInput(key('a'))).toEqual({ consumed: false })
			expect(popups.handleInput(mouse('down', 10, 10))).toEqual({ consumed: false })
			expect(popups.handleInput({ type: 'resize', cols: 80, rows: 24 })).toEqual({
				consumed: false,
			})
		})

		it('applies and consumes clicks on the docked style panel', () => {
			ctx.dispose()
			ctx = createTestContext({ cols: 140, rows: 40 })
			ctx.getLayout = () => layoutChrome(140, 40, snapshotUi(ctx.ui), ctx.editor)
			popups = createPopupController(ctx)
			const id = addRect(ctx)
			ctx.editor.select(id)
			render()
			const next = ctx.hotRegions.find((r) => r.id === 'style.color.next')!
			expect(popups.handleInput(mouse('down', next.rect.x, next.rect.y))).toEqual({
				consumed: true,
			})
			expect((ctx.editor.getShape(id)!.props as { color: string }).color).toBe('grey')
			// Other buttons and releases inside the panel are swallowed, hover is not.
			expect(popups.handleInput(mouse('up', next.rect.x, next.rect.y))).toEqual({ consumed: true })
			expect(popups.handleInput(mouse('move', next.rect.x, next.rect.y))).toEqual({
				consumed: false,
			})
			// Clicks on the canvas beside the panel pass through.
			expect(popups.handleInput(mouse('down', 5, 5))).toEqual({ consumed: false })
		})
	})

	describe('menus', () => {
		it('opens, navigates with arrows and returns the chosen action', () => {
			popups.openMenu('file')
			expect(ctx.ui.popup.get()).toEqual({
				kind: 'menu',
				menu: 'file',
				index: 0,
				submenu: null,
				submenuIndex: 0,
			})
			expect(popups.handleInput(key('ArrowDown'))).toEqual({ consumed: true })
			expect(ctx.ui.popup.get()).toMatchObject({ index: 1 })
			// Skips the separator between Open… and Save.
			popups.handleInput(key('ArrowDown'))
			expect(ctx.ui.popup.get()).toMatchObject({ index: 3 })
			popups.handleInput(key('ArrowUp'))
			expect(ctx.ui.popup.get()).toMatchObject({ index: 1 })
			expect(popups.handleInput(key('Enter'))).toEqual({
				consumed: true,
				action: { id: 'file.open' },
			})
			expect(ctx.ui.popup.get()).toBeNull()
		})

		it('wraps around, switches menus with left/right and closes with Escape', () => {
			popups.openMenu('file')
			popups.handleInput(key('ArrowUp'))
			expect(ctx.ui.popup.get()).toMatchObject({ index: 7 })
			popups.handleInput(key('ArrowRight'))
			expect(ctx.ui.popup.get()).toMatchObject({ menu: 'edit', index: 0 })
			popups.handleInput(key('ArrowLeft'))
			popups.handleInput(key('ArrowLeft'))
			expect(ctx.ui.popup.get()).toMatchObject({ menu: 'help' })
			expect(popups.handleInput(key('Escape'))).toEqual({ consumed: true })
			expect(ctx.ui.popup.get()).toBeNull()
		})

		it('jumps to items by letter and activates unique matches', () => {
			popups.openMenu('file')
			expect(popups.handleInput(key('q'))).toEqual({ consumed: true, action: { id: 'app.quit' } })
			popups.openMenu('file')
			// Two items start with 's': Save and Save as…; the first press only moves.
			expect(popups.handleInput(key('s'))).toEqual({ consumed: true })
			expect(ctx.ui.popup.get()).toMatchObject({ index: 3 })
			popups.handleInput(key('s'))
			expect(ctx.ui.popup.get()).toMatchObject({ index: 4 })
			expect(popups.handleInput(key('Enter'))).toEqual({
				consumed: true,
				action: { id: 'file.save-as' },
			})
		})

		it('consumes Enter on a disabled item', () => {
			popups.openMenu('edit')
			expect(ctx.editor.getCanUndo()).toBe(false)
			expect(popups.handleInput(key('Enter'))).toEqual({ consumed: true })
			expect(ctx.ui.popup.get()).not.toBeNull()
		})

		it('opens the Arrange submenu and returns its actions', () => {
			ctx.editor.select(addRect(ctx), addRect(ctx, 300, 0))
			popups.openMenu('edit')
			popups.handleInput(key('End'))
			const m = model()
			expect(m.kind).toBe('menu')
			if (m.kind !== 'menu') return
			expect(m.list.items[m.list.selected].label).toBe('Arrange')
			popups.handleInput(key('ArrowRight'))
			expect(ctx.ui.popup.get()).toMatchObject({ submenu: 'Arrange', submenuIndex: 0 })
			popups.handleInput(key('ArrowDown'))
			expect(popups.handleInput(key('Enter'))).toEqual({
				consumed: true,
				action: { id: 'arrange.align-center-horizontal' },
			})
			popups.openMenu('edit')
			popups.handleInput(key('End'))
			popups.handleInput(key('Enter'))
			expect(ctx.ui.popup.get()).toMatchObject({ submenu: 'Arrange' })
			popups.handleInput(key('Escape'))
			expect(ctx.ui.popup.get()).toMatchObject({ submenu: null, menu: 'edit' })
		})

		it('picks items with the mouse and closes on a click outside', () => {
			popups.openMenu('file')
			const m = model()
			if (m.kind !== 'menu') throw new Error('expected a menu model')
			const saveIndex = m.list.items.findIndex((i) => i.label === 'Save')
			const row = m.list.rect.y + 1 + saveIndex
			// Hovering moves the selection without choosing.
			expect(popups.handleInput(mouse('move', m.list.rect.x + 2, row))).toEqual({ consumed: true })
			expect(ctx.ui.popup.get()).toMatchObject({ index: saveIndex })
			expect(popups.handleInput(mouse('down', m.list.rect.x + 2, row))).toEqual({
				consumed: true,
				action: { id: 'file.save' },
			})
			popups.openMenu('file')
			// Menubar titles switch menus.
			const edit = model()
			if (edit.kind !== 'menu') throw new Error('expected a menu model')
			const editEntry = edit.menubar.entries.find((e) => e.id === 'edit')!
			popups.handleInput(mouse('down', editEntry.x, edit.menubar.row))
			expect(ctx.ui.popup.get()).toMatchObject({ menu: 'edit' })
			expect(popups.handleInput(mouse('down', 50, 20))).toEqual({ consumed: true })
			expect(ctx.ui.popup.get()).toBeNull()
		})

		it('toggles when opened twice and swallows key releases', () => {
			popups.openMenu()
			expect(ctx.ui.popup.get()).toMatchObject({ kind: 'menu', menu: 'file' })
			popups.openMenu()
			expect(ctx.ui.popup.get()).toBeNull()
			popups.openMenu('view')
			expect(popups.handleInput(key('Escape', { release: true }))).toEqual({ consumed: true })
			expect(ctx.ui.popup.get()).not.toBeNull()
		})
	})

	describe('context menu', () => {
		it('lists selection actions with a selection and paste otherwise', () => {
			popups.openContextMenu(10, 10)
			let m = model()
			if (m.kind !== 'context') throw new Error('expected a context model')
			expect(m.list.items.map((i) => i.label)).toEqual(['Paste', 'Select all'])
			expect(popups.handleInput(key('Enter'))).toEqual({
				consumed: true,
				action: { id: 'edit.paste' },
			})

			ctx.editor.select(addRect(ctx))
			popups.openContextMenu(10, 10)
			m = model()
			if (m.kind !== 'context') throw new Error('expected a context model')
			expect(m.list.items.filter((i) => !i.separator).map((i) => i.label)).toEqual([
				'Cut',
				'Copy',
				'Paste',
				'Duplicate',
				'Delete',
				'Edit text',
				'Group',
				'Lock or unlock',
				'Bring to front',
				'Send to back',
				'Select all',
			])
			expect(m.rect).toEqual({ x: 10, y: 10, w: m.rect.w, h: 16 })
			popups.handleInput(key('d'))
			expect(popups.handleInput(key('Enter'))).toEqual({
				consumed: true,
				action: { id: 'edit.duplicate' },
			})
		})

		it('closes on a right click outside and consumes one inside', () => {
			popups.openContextMenu(10, 10)
			expect(popups.handleInput(mouse('down', 11, 11, 2))).toEqual({ consumed: true })
			expect(ctx.ui.popup.get()).not.toBeNull()
			expect(popups.handleInput(mouse('down', 60, 25, 2))).toEqual({ consumed: true })
			expect(ctx.ui.popup.get()).toBeNull()
		})
	})

	describe('geo picker', () => {
		it('starts on the current geo and returns tool.geo with the chosen shape', () => {
			popups.openGeoPicker()
			expect(ctx.ui.popup.get()).toEqual({ kind: 'geo', index: 1 })
			popups.handleInput(key('ArrowDown'))
			expect(popups.handleInput(key('Enter'))).toEqual({
				consumed: true,
				action: { id: 'tool.geo', arg: 'ellipse' },
			})
			popups.openGeoPicker()
			expect(popups.handleInput(key('h'))).toEqual({ consumed: true })
			expect(ctx.ui.popup.get()).toMatchObject({ index: 6 })
			popups.handleInput(key('h'))
			expect(popups.handleInput(key(' '))).toEqual({
				consumed: true,
				action: { id: 'tool.geo', arg: 'heart' },
			})
		})

		it('scrolls the list on a short terminal and picks with the mouse', () => {
			ctx.dispose()
			ctx = createTestContext({ cols: 80, rows: 20 })
			ctx.getLayout = () => layoutChrome(80, 20, snapshotUi(ctx.ui), ctx.editor)
			popups = createPopupController(ctx)
			popups.openGeoPicker()
			popups.handleInput(key('End'))
			const m = buildPopupModel(ctx.ui.popup.get()!, {
				cols: 80,
				rows: 20,
				editor: ctx.editor,
				ui: ctx.ui,
				encoding: 'legacy',
				env: {},
				glyphs: ctx.glyphs,
			})
			if (m.kind !== 'geo') throw new Error('expected a geo model')
			expect(m.list.visible).toBeLessThan(m.list.items.length)
			expect(m.list.scroll).toBeGreaterThan(0)
			const row = m.list.rect.y + 1 + (m.list.selected - m.list.scroll)
			expect(popups.handleInput(mouse('down', m.list.rect.x + 3, row))).toEqual({
				consumed: true,
				action: { id: 'tool.geo', arg: 'heart' },
			})
		})
	})

	describe('pages', () => {
		it('lists the pages and switches with page.switch', () => {
			const second = ctx.editor.createPage({ name: 'Second' }).getPages()[1]
			popups.openPages()
			expect(ctx.ui.popup.get()).toEqual({ kind: 'pages', index: 0 })
			const m = model()
			if (m.kind !== 'pages') throw new Error('expected a pages model')
			expect(m.list.items.map((i) => i.label)).toEqual([
				'Page 1',
				'Second',
				'',
				'New page',
				'Rename page',
				'Duplicate page',
				'Delete page',
				'',
				'Previous page',
				'Next page',
			])
			expect(m.list.items[0].checked).toBe(true)
			expect(m.list.items[8].enabled).toBe(false)
			expect(m.list.items[9].enabled).toBe(true)
			popups.handleInput(key('ArrowDown'))
			expect(popups.handleInput(key('Enter'))).toEqual({
				consumed: true,
				action: { id: 'page.switch', arg: second.id },
			})
			popups.openPages()
			popups.handleInput(key('End'))
			expect(popups.handleInput(key('Enter'))).toEqual({
				consumed: true,
				action: { id: 'page.next' },
			})
		})
	})

	describe('help', () => {
		it('switches tabs and scrolls', () => {
			popups.openHelp()
			expect(ctx.ui.popup.get()).toEqual({ kind: 'help', tab: 0, scroll: 0 })
			popups.handleInput(key('ArrowRight'))
			expect(ctx.ui.popup.get()).toEqual({ kind: 'help', tab: 1, scroll: 0 })
			popups.handleInput(key('ArrowDown'))
			popups.handleInput(key('ArrowDown'))
			expect(ctx.ui.popup.get()).toEqual({ kind: 'help', tab: 1, scroll: 2 })
			popups.handleInput(key('PageDown'))
			const m = model()
			if (m.kind !== 'help') throw new Error('expected a help model')
			expect(m.scroll).toBe(Math.min(2 + m.visible, m.lines.length - m.visible))
			popups.handleInput(key('ArrowUp'))
			expect(ctx.ui.popup.get()).toMatchObject({ scroll: m.scroll - 1 })
			popups.handleInput(key('ArrowLeft'))
			popups.handleInput(key('ArrowLeft'))
			expect(ctx.ui.popup.get()).toMatchObject({ tab: 4, scroll: 0 })
			popups.handleInput(mouse('wheel', 40, 10))
			expect(ctx.ui.popup.get()).toMatchObject({ scroll: 0 })
			expect(popups.handleInput(key('Escape'))).toEqual({ consumed: true })
			expect(ctx.ui.popup.get()).toBeNull()
		})

		it('renders the full-encoding chords when the encoding is full', () => {
			ctx.ui.keyboardEncoding.set('full')
			popups.openHelp()
			popups.handleInput(key('ArrowRight'))
			const m = model()
			if (m.kind !== 'help') throw new Error('expected a help model')
			const redo = m.lines.find((l) => l.text === 'Redo')!
			expect(redo.kbd).toBe('ctrl+shift+z')
			ctx.ui.keyboardEncoding.set('legacy')
			const legacy = model()
			if (legacy.kind !== 'help') throw new Error('expected a help model')
			expect(legacy.lines.find((l) => l.text === 'Redo')!.kbd).toBe('ctrl+y')
		})
	})

	describe('style popup', () => {
		it('changes the focused value with left/right and applies it to the selection', () => {
			const id = addRect(ctx)
			ctx.editor.select(id)
			popups.openStylePanel()
			expect(ctx.ui.popup.get()).toEqual({ kind: 'style', row: 0 })
			expect(popups.handleInput(key('ArrowRight'))).toEqual({ consumed: true })
			expect((ctx.editor.getShape(id)!.props as { color: string }).color).toBe('grey')
			popups.handleInput(key('ArrowLeft'))
			popups.handleInput(key('ArrowLeft'))
			// Wraps past black to the last listed colour; white is hidden like in tldraw's panel.
			expect((ctx.editor.getShape(id)!.props as { color: string }).color).toBe('red')
			// Letter keys jump to a row; the next shape style follows too.
			popups.handleInput(key('f'))
			const m = model()
			if (m.kind !== 'style') throw new Error('expected a style model')
			expect(m.rows[m.focused].id).toBe('fill')
			popups.handleInput(key('ArrowRight'))
			expect((ctx.editor.getShape(id)!.props as { fill: string }).fill).toBe('semi')
			expect(ctx.editor.getStyleForNextShape(m.rows[m.focused].prop!)).toBe('semi')
			popups.handleInput(key('o'))
			popups.handleInput(key('ArrowLeft'))
			expect(ctx.editor.getShape(id)!.opacity).toBeCloseTo(0.75)
			expect(popups.handleInput(key('Enter'))).toEqual({ consumed: true })
			expect(ctx.ui.popup.get()).toBeNull()
			// Each change is its own undo step.
			ctx.editor.undo()
			expect(ctx.editor.getShape(id)!.opacity).toBe(1)
		})

		it('applies a clicked value cell and steps on the arrows', () => {
			const id = addRect(ctx)
			ctx.editor.select(id)
			popups.openStylePanel()
			const m = model()
			if (m.kind !== 'style') throw new Error('expected a style model')
			const dash = m.layout.find((l) => l.row.id === 'dash')!
			const dotted = dash.cells.find((c) => c.value === 'dotted')!
			expect(popups.handleInput(mouse('down', dotted.x, dash.cellsY))).toEqual({ consumed: true })
			expect((ctx.editor.getShape(id)!.props as { dash: string }).dash).toBe('dotted')
			expect(ctx.ui.popup.get()).toMatchObject({ row: m.layout.indexOf(dash) })
			const geo = m.layout.find((l) => l.row.id === 'geo')!
			expect(geo.mode).toBe('cycle')
			const next = geo.cells[2]
			popups.handleInput(mouse('down', next.x, geo.cellsY))
			expect((ctx.editor.getShape(id)!.props as { geo: string }).geo).toBe('ellipse')
			expect(popups.handleInput(mouse('down', 0, m.rect.y + m.rect.h + 1))).toEqual({
				consumed: true,
			})
			expect(ctx.ui.popup.get()).toBeNull()
		})

		it('shows a hint instead of opening when nothing has styles', () => {
			popups.openStylePanel()
			expect(ctx.ui.popup.get()).toBeNull()
			expect(ctx.ui.hint.get()).toContain('Select a shape')
		})
	})

	describe('prompts', () => {
		let dir: string
		beforeEach(() => {
			dir = mkdtempSync(join(tmpdir(), 'tui-prompt-'))
			writeFileSync(join(dir, 'alpha.tldr'), '')
			writeFileSync(join(dir, 'alphabet.tldr'), '')
			writeFileSync(join(dir, '.hidden.tldr'), '')
			mkdirSync(join(dir, 'docs'))
		})
		afterEach(() => rmSync(dir, { recursive: true, force: true }))

		it('edits text, submits with Enter and closes', () => {
			const onSubmit = vi.fn()
			popups.prompt({ kind: 'text', label: 'Rename page:', initial: 'Page 1', onSubmit })
			const state = () => {
				const popup = ctx.ui.popup.get()
				if (popup?.kind !== 'prompt') throw new Error('expected a prompt')
				return popup.prompt
			}
			expect(state()).toMatchObject({ value: 'Page 1', caret: 6 })
			popups.handleInput(key('Backspace'))
			popups.handleInput(key('2'))
			expect(state().value).toBe('Page 2')
			popups.handleInput(key('Home'))
			popups.handleInput(key('Delete'))
			popups.handleInput(key('p'))
			popups.handleInput(key('ArrowRight'))
			popups.handleInput(key('ArrowRight'))
			popups.handleInput(key('ArrowRight'))
			popups.handleInput(key('ArrowRight'))
			popups.handleInput(key('-'))
			expect(state()).toMatchObject({ value: 'page -2', caret: 6 })
			popups.handleInput({ type: 'paste', text: 'x\ny' })
			expect(state().value).toBe('page -x y2')
			popups.handleInput(key('u', { ctrl: true }))
			expect(state().value).toBe('2')
			expect(popups.handleInput(mouse('down', 5, 5))).toEqual({ consumed: true })
			expect(popups.handleInput(key('Enter'))).toEqual({ consumed: true })
			expect(onSubmit).toHaveBeenCalledWith('2')
			expect(ctx.ui.popup.get()).toBeNull()
		})

		it('cancels with Escape', () => {
			const onSubmit = vi.fn()
			const onCancel = vi.fn()
			popups.prompt({ kind: 'path', label: 'Open:', onSubmit, onCancel })
			popups.handleInput(key('a'))
			expect(popups.handleInput(key('Escape'))).toEqual({ consumed: true })
			expect(onCancel).toHaveBeenCalledOnce()
			expect(onSubmit).not.toHaveBeenCalled()
			expect(ctx.ui.popup.get()).toBeNull()
		})

		it('completes paths with Tab and cycles through candidates', () => {
			popups.prompt({ kind: 'path', label: 'Open:', initial: `${dir}/al`, onSubmit() {} })
			const value = () => {
				const popup = ctx.ui.popup.get()
				if (popup?.kind !== 'prompt') throw new Error('expected a prompt')
				return popup.prompt.value
			}
			popups.handleInput(key('Tab'))
			expect(value()).toBe(`${dir}/alpha`)
			popups.handleInput(key('Tab'))
			expect(value()).toBe(`${dir}/alpha.tldr`)
			popups.handleInput(key('Tab'))
			expect(value()).toBe(`${dir}/alphabet.tldr`)
			popups.handleInput(key('Tab'))
			expect(value()).toBe(`${dir}/alpha.tldr`)
			// A single match completes at once; directories get a slash.
			popups.handleInput(key('u', { ctrl: true }))
			for (const ch of `${dir}/do`) popups.handleInput(key(ch))
			popups.handleInput(key('Tab'))
			expect(value()).toBe(`${dir}/docs/`)
			// With no progress to make, Tab cycles from the first candidate; dotfiles are not offered.
			popups.handleInput(key('u', { ctrl: true }))
			for (const ch of `${dir}/`) popups.handleInput(key(ch))
			popups.handleInput(key('Tab'))
			expect(value()).toBe(`${dir}/alpha.tldr`)
			popups.handleInput(key('Tab'))
			popups.handleInput(key('Tab'))
			expect(value()).toBe(`${dir}/docs/`)
			// An unreadable directory changes nothing.
			popups.handleInput(key('u', { ctrl: true }))
			for (const ch of `${dir}/nope/x`) popups.handleInput(key(ch))
			popups.handleInput(key('Tab'))
			expect(value()).toBe(`${dir}/nope/x`)
		})

		it('expands ~ for completion and keeps it in the value', () => {
			ctx.env.HOME = dir
			popups.prompt({ kind: 'path', label: 'Save as:', initial: '~/do', onSubmit() {} })
			popups.handleInput(key('Tab'))
			const popup = ctx.ui.popup.get()
			if (popup?.kind !== 'prompt') throw new Error('expected a prompt')
			expect(popup.prompt.value).toBe('~/docs/')
		})

		it('recalls earlier answers with the arrow keys', () => {
			popups.prompt({ kind: 'path', label: 'Open:', onSubmit() {} })
			for (const ch of 'one.tldr') popups.handleInput(key(ch))
			popups.handleInput(key('Enter'))
			popups.prompt({ kind: 'path', label: 'Open:', onSubmit() {} })
			for (const ch of 'two.tldr') popups.handleInput(key(ch))
			popups.handleInput(key('Enter'))
			popups.prompt({ kind: 'path', label: 'Open:', onSubmit() {} })
			popups.handleInput(key('d'))
			const value = () => {
				const popup = ctx.ui.popup.get()
				if (popup?.kind !== 'prompt') throw new Error('expected a prompt')
				return popup.prompt.value
			}
			popups.handleInput(key('ArrowUp'))
			expect(value()).toBe('two.tldr')
			popups.handleInput(key('ArrowUp'))
			expect(value()).toBe('one.tldr')
			popups.handleInput(key('ArrowUp'))
			expect(value()).toBe('one.tldr')
			popups.handleInput(key('ArrowDown'))
			popups.handleInput(key('ArrowDown'))
			expect(value()).toBe('d')
			// A different prompt has its own history.
			popups.handleInput(key('Escape'))
			popups.prompt({ kind: 'path', label: 'Save as:', onSubmit() {} })
			popups.handleInput(key('ArrowUp'))
			expect(value()).toBe('')
		})

		it('accepts a choice key for confirm prompts and ignores other keys', () => {
			const onSubmit = vi.fn()
			const onCancel = vi.fn()
			popups.prompt({
				kind: 'confirm',
				label: 'Unsaved changes — save?',
				choices: [
					{ key: 'y', label: 'save' },
					{ key: 'n', label: 'discard' },
				],
				onSubmit,
				onCancel,
			})
			expect(popups.handleInput(key('x'))).toEqual({ consumed: true })
			expect(popups.handleInput(key('Enter'))).toEqual({ consumed: true })
			expect(onSubmit).not.toHaveBeenCalled()
			expect(ctx.ui.popup.get()).not.toBeNull()
			expect(popups.handleInput(key('N', { shift: true }))).toEqual({ consumed: true })
			expect(onSubmit).toHaveBeenCalledWith('n')
			expect(ctx.ui.popup.get()).toBeNull()
			popups.prompt({
				kind: 'confirm',
				label: 'Sure?',
				choices: [{ key: 'y', label: 'yes' }],
				onSubmit,
				onCancel,
			})
			popups.handleInput(key('Escape'))
			expect(onCancel).toHaveBeenCalledOnce()
		})
	})

	it('closeAll clears any popup', () => {
		popups.openHelp()
		popups.closeAll()
		expect(ctx.ui.popup.get()).toBeNull()
		popups.closeAll()
		expect(ctx.ui.popup.get()).toBeNull()
	})
})
