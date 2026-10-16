import { GeoShapeGeoStyle, createShapeId, toRichText } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Screen } from '../terminal/Screen'
import { createTestContext, type TestContext } from '../test/testContext'
import {
	FIRST_RUN_HINT,
	chromePalette,
	layoutChrome,
	renderChrome,
	snapshotUi,
	type ChromeContext,
} from './renderChrome'

function chromeContext(ctx: TestContext, overrides: Partial<ChromeContext> = {}): ChromeContext {
	return {
		editor: ctx.editor,
		ui: ctx.ui,
		glyphs: ctx.glyphs,
		colorMode: 'light',
		capabilities: ctx.capabilities,
		filePath: ctx.ui.filePath.get(),
		dirty: ctx.ui.dirty.get(),
		debugStats: ctx.ui.debugStats,
		now: ctx.time,
		env: {},
		...overrides,
	}
}

function render(
	ctx: TestContext,
	cols: number,
	rows: number,
	overrides: Partial<ChromeContext> = {}
) {
	const layout = layoutChrome(cols, rows, snapshotUi(ctx.ui), ctx.editor)
	const screen = new Screen(cols, rows)
	const regions = renderChrome(screen, layout, chromeContext(ctx, overrides))
	const lines = screen.toText().split('\n')
	return { layout, screen, regions, lines, toolbar: lines[0], status: lines[rows - 1] }
}

function addRect(ctx: TestContext, x = 0, y = 0) {
	const id = createShapeId()
	ctx.editor.createShape({ id, type: 'geo', x, y, props: { w: 100, h: 100 } })
	return id
}

describe('layoutChrome', () => {
	let ctx: TestContext
	beforeEach(() => {
		ctx = createTestContext()
	})
	afterEach(() => ctx.dispose())

	it('picks the density from the width and keeps the toolbar and status rows', () => {
		const ui = snapshotUi(ctx.ui)
		const small = layoutChrome(80, 24, ui, ctx.editor)
		expect(small).toMatchObject({
			cols: 80,
			rows: 24,
			toolbarRow: 0,
			statusRow: 23,
			canvas: { x: 0, y: 1, w: 80, h: 22 },
			stylePanel: null,
			popup: null,
			density: 'minimal',
		})
		expect(layoutChrome(100, 30, ui, ctx.editor).density).toBe('compact')
		expect(layoutChrome(119, 30, ui, ctx.editor).density).toBe('compact')
		expect(layoutChrome(140, 40, ui, ctx.editor).density).toBe('full')
	})

	it('docks the style panel only when wide, open and relevant', () => {
		// Open (default) but nothing selected and the select tool active: not relevant.
		expect(layoutChrome(140, 40, snapshotUi(ctx.ui), ctx.editor).stylePanel).toBeNull()

		ctx.editor.setCurrentTool('geo')
		const docked = layoutChrome(140, 40, snapshotUi(ctx.ui), ctx.editor)
		expect(docked.stylePanel).toEqual({ x: 122, y: 1, w: 18, h: 38 })
		expect(docked.canvas).toEqual({ x: 0, y: 1, w: 122, h: 38 })

		// A selection in the select tool is relevant too.
		ctx.editor.setCurrentTool('select')
		ctx.editor.select(addRect(ctx))
		expect(layoutChrome(110, 30, snapshotUi(ctx.ui), ctx.editor).stylePanel).toEqual({
			x: 92,
			y: 1,
			w: 18,
			h: 28,
		})
		// Too narrow, or closed by the user: no dock.
		expect(layoutChrome(109, 30, snapshotUi(ctx.ui), ctx.editor).stylePanel).toBeNull()
		ctx.ui.stylePanelOpen.set(false)
		expect(layoutChrome(140, 40, snapshotUi(ctx.ui), ctx.editor).stylePanel).toBeNull()
	})

	it('clamps popups over the canvas of an 80x24 terminal', () => {
		ctx.editor.select(addRect(ctx))
		ctx.ui.openPopup({ kind: 'context', col: 78, row: 22, index: 0 })
		const context = layoutChrome(80, 24, snapshotUi(ctx.ui), ctx.editor).popup!
		expect(context.x + context.w).toBeLessThanOrEqual(80)
		expect(context.y).toBeGreaterThanOrEqual(1)
		expect(context.y + context.h).toBeLessThanOrEqual(23)

		ctx.ui.openPopup({ kind: 'geo', index: 0 })
		const geo = layoutChrome(80, 24, snapshotUi(ctx.ui), ctx.editor).popup!
		expect(geo.h).toBeLessThanOrEqual(22)
		expect(geo.y).toBeGreaterThanOrEqual(1)

		ctx.ui.openPopup({ kind: 'help', tab: 0, scroll: 0 })
		const help = layoutChrome(80, 24, snapshotUi(ctx.ui), ctx.editor).popup!
		expect(help).toEqual({ x: 2, y: 1, w: 76, h: 22 })

		ctx.ui.openPopup({ kind: 'style', row: 0 })
		const style = layoutChrome(80, 24, snapshotUi(ctx.ui), ctx.editor).popup!
		expect(style.w).toBeLessThanOrEqual(80)
		expect(style.y + style.h).toBeLessThanOrEqual(23)

		ctx.ui.openPopup({ kind: 'menu', menu: 'help', index: 0, submenu: null, submenuIndex: 0 })
		const menu = layoutChrome(80, 24, snapshotUi(ctx.ui), ctx.editor).popup!
		expect(menu.y).toBe(2)
		expect(menu.x + menu.w).toBeLessThanOrEqual(80)
	})

	it('widens a menu dropdown for full-encoding chords', () => {
		ctx.ui.openPopup({ kind: 'menu', menu: 'edit', index: 0, submenu: null, submenuIndex: 0 })
		const legacy = layoutChrome(140, 40, snapshotUi(ctx.ui), ctx.editor).popup!
		ctx.ui.keyboardEncoding.set('full')
		const full = layoutChrome(140, 40, snapshotUi(ctx.ui), ctx.editor).popup!
		expect(full.w).toBeGreaterThan(legacy.w)
	})
})

describe('renderChrome toolbar', () => {
	let ctx: TestContext
	beforeEach(() => {
		ctx = createTestContext()
	})
	afterEach(() => ctx.dispose())

	it('renders the three densities', () => {
		expect(render(ctx, 140, 40).toolbar).toMatchInlineSnapshot(
			`"v select h hand d draw e eraser a arrow l line t text n note f frame r rect o ellipse g geo▾ k laser D highlight                 │ ↶ ↷ │ ≡ ?"`
		)
		expect(render(ctx, 100, 30).toolbar).toMatchInlineSnapshot(
			`"v sel h hnd d drw e ers a arw l lin t txt n nte f frm r rct o ell g geo k lsr D hlt      │ ↶ ↷ │ ≡ ?"`
		)
		expect(render(ctx, 80, 24).toolbar).toMatchInlineSnapshot(
			`"v h d e a l t n f r o g k D                                          │ ↶ ↷ │ ≡ ?"`
		)
	})

	it('fits exactly at the density thresholds', () => {
		for (const cols of [120, 90, 80, 40]) {
			const { toolbar, regions } = render(ctx, cols, 24)
			expect(toolbar.length).toBeLessThanOrEqual(cols)
			expect(regions.some((r) => r.id === 'toolbar.help')).toBe(true)
		}
	})

	it('draws the active tool inverse and the others with an accent key', () => {
		ctx.editor.setCurrentTool('draw')
		const { screen, regions } = render(ctx, 140, 40)
		const draw = regions.find((r) => r.id === 'tool.draw')!
		const select = regions.find((r) => r.id === 'tool.select')!
		const drawCell = screen.getCell(draw.rect.x, 0)!
		const selectCell = screen.getCell(select.rect.x, 0)!
		expect(drawCell.glyph).toBe('d')
		expect(drawCell.style.bg).toBe(selectCell.style.fg)
		expect(selectCell.style.bold).toBe(true)
		expect(screen.getCell(select.rect.x + 2, 0)!.style.bold).toBeUndefined()
	})

	it('lights up rect, ellipse or geo depending on the next geo style', () => {
		const accent = chromePalette('light').accent
		const activeIds = () => {
			const { screen, regions } = render(ctx, 140, 40)
			return regions
				.filter((r) => r.rect.y === 0 && screen.getCell(r.rect.x, 0)!.style.bg === accent)
				.map((r) => r.id)
		}
		ctx.editor.setCurrentTool('geo')
		expect(activeIds()).toEqual(['tool.rectangle'])
		ctx.editor.setStyleForNextShapes(GeoShapeGeoStyle, 'ellipse')
		expect(activeIds()).toEqual(['tool.ellipse'])
		ctx.editor.setStyleForNextShapes(GeoShapeGeoStyle, 'cloud')
		expect(activeIds()).toEqual(['tool.geo'])
		ctx.editor.setCurrentTool('select')
		expect(activeIds()).toEqual(['tool.select'])
	})

	it('exposes every item as a hot region with its action', () => {
		const { regions } = render(ctx, 140, 40)
		const ids = regions.map((r) => r.id)
		expect(ids).toEqual(
			expect.arrayContaining([
				'tool.select',
				'tool.hand',
				'tool.draw',
				'tool.eraser',
				'tool.arrow',
				'tool.line',
				'tool.text',
				'tool.note',
				'tool.frame',
				'tool.rectangle',
				'tool.ellipse',
				'tool.geo',
				'tool.laser',
				'tool.highlight',
				'toolbar.undo',
				'toolbar.redo',
				'toolbar.menu',
				'toolbar.help',
			])
		)
		expect(regions.find((r) => r.id === 'tool.rectangle')!.action).toEqual({ id: 'tool.rectangle' })
		expect(regions.find((r) => r.id === 'tool.geo')!.action).toEqual({ id: 'ui.geo-picker' })
		expect(regions.find((r) => r.id === 'toolbar.undo')!.action).toEqual({ id: 'edit.undo' })
		expect(regions.find((r) => r.id === 'toolbar.menu')!.action).toEqual({ id: 'ui.menu' })
		// Regions do not overlap and all sit on the toolbar row.
		const sorted = regions.filter((r) => r.rect.y === 0).sort((a, b) => a.rect.x - b.rect.x)
		for (let i = 1; i < sorted.length; i++) {
			expect(sorted[i].rect.x).toBeGreaterThanOrEqual(sorted[i - 1].rect.x + sorted[i - 1].rect.w)
		}
	})

	it('dims undo and redo until there is history', () => {
		let { screen, regions } = render(ctx, 140, 40)
		const undo = regions.find((r) => r.id === 'toolbar.undo')!
		expect(screen.getCell(undo.rect.x, 0)!.style.dim).toBe(true)
		ctx.editor.markHistoryStoppingPoint('test')
		addRect(ctx)
		;({ screen, regions } = render(ctx, 140, 40))
		const undo2 = regions.find((r) => r.id === 'toolbar.undo')!
		expect(screen.getCell(undo2.rect.x, 0)!.glyph).toBe('↶')
		expect(screen.getCell(undo2.rect.x, 0)!.style.dim).toBeUndefined()
	})
})

describe('renderChrome status bar', () => {
	let ctx: TestContext
	beforeEach(() => {
		ctx = createTestContext()
		ctx.ui.firstKeySeen.set(true)
	})
	afterEach(() => ctx.dispose())

	it('shows the tool, zoom, selection count and file name', () => {
		ctx.editor.select(addRect(ctx), addRect(ctx, 200, 0))
		const { status } = render(ctx, 100, 30)
		expect(status).toContain('Select • 100% • 2 selected')
		expect(status.trimEnd().endsWith('untitled')).toBe(true)
	})

	it('shows the first-run hint until the first key, even on narrow terminals', () => {
		ctx.ui.firstKeySeen.set(false)
		expect(render(ctx, 80, 24).status).toContain(FIRST_RUN_HINT)
		ctx.ui.firstKeySeen.set(true)
		expect(render(ctx, 80, 24).status).not.toContain(FIRST_RUN_HINT)
	})

	it('prefers the error over everything else and drops it when expired', () => {
		ctx.ui.showError('Could not save: EACCES', 0)
		const { status, screen } = render(ctx, 100, 30, { now: 1000 })
		expect(status.startsWith(' ! Could not save: EACCES')).toBe(true)
		expect(status).not.toContain('Select')
		const cell = screen.getCell(1, 29)!
		expect(cell.style.bold).toBe(true)
		expect(cell.style.fg).not.toBe(screen.getCell(1, 0)!.style.fg)
		expect(render(ctx, 100, 30, { now: 4000 }).status).toContain('Select')
	})

	it('prefers a prompt over the error and draws a caret', () => {
		ctx.ui.showError('boom', 0)
		ctx.ui.openPopup({
			kind: 'prompt',
			prompt: {
				spec: { kind: 'path', label: 'Open:', onSubmit() {} },
				value: 'ab',
				caret: 1,
				completions: [],
				completionIndex: -1,
			},
		})
		const { status, screen } = render(ctx, 80, 24)
		expect(status.startsWith(' Open: ab')).toBe(true)
		expect(status).not.toContain('boom')
		expect(screen.getCell(8, 23)!.glyph).toBe('b')
		expect(screen.getCell(8, 23)!.style.inverse).toBe(true)
	})

	it('renders confirm prompts with their choices', () => {
		ctx.ui.openPopup({
			kind: 'prompt',
			prompt: {
				spec: {
					kind: 'confirm',
					label: 'Unsaved changes — save?',
					choices: [
						{ key: 'y', label: 'save' },
						{ key: 'n', label: 'discard' },
					],
					onSubmit() {},
				},
				value: '',
				caret: 0,
				completions: [],
				completionIndex: -1,
			},
		})
		expect(render(ctx, 100, 24).status).toContain(
			'Unsaved changes — save? (y: save · n: discard · esc: cancel)'
		)
	})

	it('shows the dirty marker, grid and snap and debug stats on the right', () => {
		ctx.ui.filePath.set('/tmp/drawings/plan.tldr')
		ctx.ui.dirty.set(true)
		ctx.editor.updateInstanceState({ isGridMode: true })
		ctx.editor.user.updateUserPreferences({ isSnapMode: true })
		ctx.ui.debug.set(true)
		ctx.ui.debugStats = {
			frameMs: 3.21,
			shapesMs: 1,
			overlaysMs: 1,
			chromeMs: 1,
			flushMs: 0.2,
			bytes: 512,
			inputToWriteMs: 4.5,
			renderedShapes: 3,
			fps: 60,
		}
		const { status, regions } = render(ctx, 120, 30, {
			filePath: '/tmp/drawings/plan.tldr',
			dirty: true,
			debugStats: ctx.ui.debugStats,
		})
		expect(status).toContain('plan.tldr*  grid  snap  60fps 3.2ms 512B 4.5ms')
		expect(regions.find((r) => r.id === 'status.grid')!.action).toEqual({ id: 'view.toggle-grid' })
		expect(regions.find((r) => r.id === 'status.snap')!.action).toEqual({ id: 'view.toggle-snap' })
		// User preferences are global (localStorage), so put snap mode back for the other tests.
		ctx.editor.user.updateUserPreferences({ isSnapMode: false })
	})

	it('shows coordinates only at 100 columns and hints only at 120', () => {
		ctx.ui.pointerCell.set({ col: 10, row: 10 })
		ctx.ui.setHint('Drag to draw')
		expect(render(ctx, 99, 30).status).not.toMatch(/\d+,\d+/)
		expect(render(ctx, 99, 30).status).not.toContain('Drag to draw')
		expect(render(ctx, 100, 30).status).toMatch(/-?\d+,-?\d+/)
		expect(render(ctx, 100, 30).status).not.toContain('Drag to draw')
		expect(render(ctx, 120, 30).status).toContain('Drag to draw')
	})

	it('shows the full text of a single selected shape as the hint', () => {
		const id = createShapeId()
		ctx.editor.createShape({
			id,
			type: 'text',
			x: 0,
			y: 0,
			props: { richText: toRichText('a rather long label\nsecond line') },
		})
		ctx.editor.select(id)
		expect(render(ctx, 140, 30).status).toContain('a rather long label / second line')
	})

	it('shows latch badges and the pointer-mode badge', () => {
		ctx.ui.toggleLatch('shift')
		ctx.ui.toggleLatch('alt')
		ctx.ui.toggleLatch('alt')
		ctx.ui.pointerMode.set(true)
		ctx.ui.pointerButtonDown.set(true)
		const { status, screen } = render(ctx, 100, 30)
		expect(status).toContain('⇧ • ⌥ • [DRAG]')
		const altCol = status.indexOf('⌥')
		expect(screen.getCell(altCol, 29)!.style.inverse).toBe(true)
		expect(screen.getCell(status.indexOf('⇧'), 29)!.style.inverse).toBeUndefined()
	})

	it('drops segments from the right and truncates when the row is too narrow', () => {
		ctx.editor.select(addRect(ctx), addRect(ctx, 200, 0))
		const wide = render(ctx, 60, 24, { filePath: '/x/plan.tldr' }).status
		expect(wide).toContain('Select • 100% • 2 selected')
		const narrow = render(ctx, 30, 24, { filePath: '/x/plan.tldr' }).status
		expect(narrow.length).toBeLessThanOrEqual(30)
		expect(narrow).toContain('Select • 100%')
		expect(narrow).not.toContain('2 selected')
		expect(narrow.trimEnd().endsWith('plan.tldr')).toBe(true)
		const tiny = render(ctx, 16, 24, { filePath: '/x/plan.tldr' }).status
		expect(tiny.length).toBeLessThanOrEqual(16)
		expect(tiny.startsWith(' Sel…')).toBe(true)
		expect(tiny.trimEnd().endsWith('plan.tldr')).toBe(true)
	})
})

describe('renderChrome docked style panel', () => {
	let ctx: TestContext
	beforeEach(() => {
		ctx = createTestContext()
	})
	afterEach(() => ctx.dispose())

	it('lists the shared styles with stepping hot regions that change the shape', () => {
		const id = addRect(ctx)
		ctx.editor.select(id)
		const { layout, lines, regions } = render(ctx, 140, 40)
		expect(layout.stylePanel).not.toBeNull()
		const panel = layout.stylePanel!
		const panelText = lines
			.slice(1, 24)
			.map((line) => line.slice(panel.x))
			.join('\n')
		expect(panelText).toContain('Style')
		expect(panelText).toContain('color')
		expect(panelText).toContain('black')
		expect(panelText).toContain('fill')
		expect(panelText).toContain('opacity')
		const next = regions.find((r) => r.id === 'style.color.next')!
		expect(next.rect.x).toBeGreaterThanOrEqual(panel.x)
		next.onPress!({
			type: 'mouse',
			action: 'down',
			button: 0,
			col: next.rect.x,
			row: next.rect.y,
			dx: 0,
			dy: 0,
			shift: false,
			ctrl: false,
			alt: false,
		})
		expect((ctx.editor.getShape(id)!.props as { color: string }).color).toBe('grey')
		const prev = regions.find((r) => r.id === 'style.fill.prev')!
		prev.onPress!({
			type: 'mouse',
			action: 'down',
			button: 0,
			col: prev.rect.x,
			row: prev.rect.y,
			dx: 0,
			dy: 0,
			shift: false,
			ctrl: false,
			alt: false,
		})
		expect((ctx.editor.getShape(id)!.props as { fill: string }).fill).toBe('lined-fill')
	})

	it('keeps the panel inside its 18 columns', () => {
		ctx.editor.select(addRect(ctx))
		const { layout, lines } = render(ctx, 110, 30)
		const panel = layout.stylePanel!
		for (const line of lines.slice(1, 29)) {
			expect(line.length).toBeLessThanOrEqual(panel.x + panel.w)
		}
	})
})

describe('renderChrome popups', () => {
	let ctx: TestContext
	beforeEach(() => {
		ctx = createTestContext()
	})
	afterEach(() => ctx.dispose())

	it('draws the menubar and dropdown with shortcuts', () => {
		ctx.ui.openPopup({ kind: 'menu', menu: 'file', index: 0, submenu: null, submenuIndex: 0 })
		const { lines } = render(ctx, 80, 24)
		expect(lines[1]).toBe(' File  Edit  View  Pages  Help')
		const dropdown = lines.slice(2, 12).join('\n')
		expect(dropdown).toContain('New')
		expect(dropdown).toContain('ctrl+n')
		expect(dropdown).toContain('Save as…')
		expect(dropdown).toContain('Quit')
		expect(dropdown).toContain('├')
	})

	it('shows full-encoding chords when the terminal supports them', () => {
		ctx.ui.openPopup({ kind: 'menu', menu: 'edit', index: 0, submenu: null, submenuIndex: 0 })
		expect(render(ctx, 100, 30).lines.join('\n')).toContain('ctrl+y')
		ctx.ui.keyboardEncoding.set('full')
		const text = render(ctx, 100, 30).lines.join('\n')
		expect(text).toContain('ctrl+shift+z')
		expect(text).not.toContain('ctrl+y')
	})

	it('draws the pages popup with a check on the current page', () => {
		ctx.editor.createPage({ name: 'Second' })
		ctx.ui.openPopup({ kind: 'pages', index: 0 })
		const text = render(ctx, 80, 24).lines.join('\n')
		expect(text).toContain('✓ Page 1')
		expect(text).toContain('  Second')
		expect(text).toContain('New page')
		expect(text).toContain('Delete page')
	})

	it('draws the help overlay with tabs, the encoding and terminal hints', () => {
		ctx.ui.openPopup({ kind: 'help', tab: 1, scroll: 0 })
		const text = render(ctx, 80, 24, {
			env: { TMUX: '/tmp/tmux-1000/default,1,0', TERM_PROGRAM: 'iTerm.app' },
		}).lines.join('\n')
		expect(text).toContain('Keyboard shortcuts · legacy keys')
		expect(text).toContain(' Tools ')
		expect(text).toContain(' Edit ')
		expect(text).toContain('Undo')
		expect(text).toContain('escape-time 10')
		expect(text).toContain('Option as Meta')
		for (const line of text.split('\n')) expect(line.length).toBeLessThanOrEqual(80)
	})

	it('draws the style popup with inline values and the selected one highlighted', () => {
		const id = addRect(ctx)
		ctx.editor.select(id)
		ctx.ui.openPopup({ kind: 'style', row: 2 })
		const { lines, screen, layout } = render(ctx, 100, 30)
		const text = lines.join('\n')
		expect(text).toContain('Style')
		expect(text).toContain('[██]')
		expect(text).toContain('none semi solid pattern fill lined-fill')
		const fillRow = lines.findIndex((l) => l.includes('none semi solid'))
		const noneCol = lines[fillRow].indexOf('none')
		expect(screen.getCell(noneCol, fillRow)!.style.bold).toBe(true)
		expect(screen.getCell(noneCol + 5, fillRow)!.style.bold).toBeUndefined()
		expect(layout.popup!.w).toBeLessThanOrEqual(100)
	})

	it('draws the geo picker and context menu as boxes', () => {
		ctx.ui.openPopup({ kind: 'geo', index: 1 })
		let text = render(ctx, 80, 24).lines.join('\n')
		expect(text).toContain('Shape')
		expect(text).toContain('✓ rectangle')
		expect(text).toContain('cloud')
		ctx.editor.select(addRect(ctx))
		ctx.ui.openPopup({ kind: 'context', col: 10, row: 5, index: 0 })
		text = render(ctx, 80, 24).lines.join('\n')
		expect(text).toContain('Cut')
		expect(text).toContain('Bring to front')
	})
})
