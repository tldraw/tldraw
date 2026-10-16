import { createShapeId, toRichText } from '@tldraw/tlschema'
import { IndexKey } from '@tldraw/utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseColor } from '../terminal/colors'
import { LINE_E, LINE_W, Screen } from '../terminal/Screen'
import { TestContext, createTestContext } from '../test/testContext'
import { OverlayRenderOptions, renderGrid, renderOverlays } from './renderOverlays'
import { renderShapes } from './renderShapes'
import { getThemeColors, shapeRgb } from './theme'

const WHITE = 0xffffff

describe('renderOverlays', () => {
	let ctx: TestContext
	let screen: Screen
	let opts: OverlayRenderOptions

	beforeEach(() => {
		ctx = createTestContext()
		screen = new Screen(100, 30, { background: WHITE })
		opts = {
			glyphs: ctx.glyphs,
			colorMode: 'light',
			stroke: 'braille',
			background: WHITE,
			editCaret: null,
			pointerCell: null,
			pointerMode: false,
			showCursorGlyph: true,
		}
	})

	afterEach(() => {
		ctx.dispose()
	})

	function render() {
		screen.clear()
		renderShapes(ctx.editor, screen, ctx.layout.canvas, opts)
		return renderOverlays(ctx.editor, screen, ctx.layout.canvas, opts)
	}

	function count(glyph: string) {
		let n = 0
		for (let row = 0; row < screen.rows; row++) {
			for (let col = 0; col < screen.cols; col++) {
				if (screen.getCell(col, row)!.glyph === glyph) n++
			}
		}
		return n
	}

	it('draws corner handles and the indicator outline for a selected shape', () => {
		const editor = ctx.editor
		const id = createShapeId()
		editor.createShape({
			id,
			type: 'geo',
			x: 0,
			y: 0,
			props: { w: 200, h: 100, richText: toRichText('Hello') },
		})
		editor.select(id)
		const types = editor.overlays
			.getActiveOverlayEntries()
			.map((entry) => (entry.util.constructor as { type?: string }).type)
		expect(types).toContain('selection_foreground')
		expect(types).toContain('shape_indicator')
		expect(() => render()).not.toThrow()
		expect(count('■')).toBeGreaterThanOrEqual(4)
		expect(screen.getCell(0, 1)!.glyph).toBe('■')
		expect(screen.getCell(25, 7)!.glyph).toBe('■')
		// Handles are drawn in the selection colour (tldraw's border), not the canvas background.
		expect(screen.getCell(0, 1)!.style.fg).toBe(parseColor('hsl(214, 84%, 56%)')!.rgb)
		// The indicator recolours the outline in the selection colour.
		expect(screen.getCell(12, 1)!.glyph).toBe('─')
		expect(screen.getCell(12, 1)!.style.fg).toBe(parseColor('hsl(214, 84%, 56%)')!.rgb)
		// The label survives the indicator pass.
		expect(screen.toText().split('\n')[4]).toContain('Hello')
	})

	it('keeps the dash, weight and arrowheads of a selected or hovered shape under the indicator', () => {
		const editor = ctx.editor
		const rect = createShapeId()
		editor.createShape({
			id: rect,
			type: 'geo',
			x: 0,
			y: 0,
			props: { w: 200, h: 100, dash: 'dashed', size: 'xl', color: 'red' },
		})
		const arrow = createShapeId()
		editor.createShape({
			id: arrow,
			type: 'arrow',
			x: 0,
			y: 200,
			props: { start: { x: 0, y: 0 }, end: { x: 240, y: 0 }, dash: 'dashed', color: 'red' },
		})
		render()
		const red = shapeRgb(getThemeColors(editor, 'light'), 'red', 'solid')
		const blue = parseColor('hsl(214, 84%, 56%)')!.rgb
		expect(screen.getCell(12, 1)).toMatchObject({ glyph: '╍', style: { fg: red } })
		expect(screen.getCell(0, 4)).toMatchObject({ glyph: '╏', style: { fg: red } })
		const headCol = screen.toText().split('\n')[13].indexOf('►')
		expect(headCol).toBeGreaterThan(20)
		expect(screen.getCell(headCol, 13)).toMatchObject({ glyph: '►', style: { fg: red } })
		expect(screen.getCell(headCol - 2, 13)).toMatchObject({ glyph: '╌', style: { fg: red } })

		// Selected: same glyphs, selection colour (the indicator and the selection box coincide).
		// The arrow's end handle takes the arrowhead cell, as the handle dot does in tldraw.
		editor.select(rect, arrow)
		render()
		expect(screen.getCell(12, 1)).toMatchObject({ glyph: '╍', style: { fg: blue } })
		expect(screen.getCell(0, 4)).toMatchObject({ glyph: '╏', style: { fg: blue } })
		expect(screen.getCell(headCol - 2, 13)).toMatchObject({ glyph: '╌', style: { fg: blue } })

		// Hovered: the indicator alone, so the arrowhead shows through it.
		editor.selectNone()
		editor.updateInstanceState({ isHoveringCanvas: true })
		editor.setHoveredShape(rect)
		render()
		expect(screen.getCell(12, 1)).toMatchObject({ glyph: '╍', style: { fg: blue } })
		expect(screen.getCell(0, 4)).toMatchObject({ glyph: '╏', style: { fg: blue } })
		editor.setHoveredShape(arrow)
		render()
		expect(screen.getCell(headCol, 13)).toMatchObject({ glyph: '►', style: { fg: blue } })
		expect(screen.getCell(headCol - 2, 13)).toMatchObject({ glyph: '╌', style: { fg: blue } })
	})

	it('draws the handles of a rotated selection as single squares', () => {
		const editor = ctx.editor
		const id = createShapeId()
		editor.createShape({ id, type: 'geo', x: 80, y: 64, props: { w: 160, h: 112 } })
		editor.select(id)
		editor.rotateShapesBy([id], Math.PI / 12)
		render()
		expect(count('■')).toBe(4)
		const text = screen.toText()
		for (const stub of ['┌', '┐', '└', '┘', '├', '┤']) expect(text).not.toContain(stub)
	})

	it('keeps a selected text shape readable under its indicator', () => {
		const editor = ctx.editor
		const id = createShapeId()
		editor.createShape({ id, type: 'text', x: 0, y: 0, props: { richText: toRichText('hello') } })
		editor.select(id)
		render()
		expect(screen.toText().split('\n')[1].startsWith('hello')).toBe(true)
	})

	it('blends the brush rectangle into cell backgrounds', () => {
		const editor = ctx.editor
		editor.updateInstanceState({ brush: { x: 0, y: 0, w: 160, h: 160 } })
		render()
		const bg = screen.getCell(5, 3)!.style.bg
		expect(bg).not.toBe(-1)
		expect(bg).not.toBe(WHITE)
		expect(screen.getCell(40, 3)!.style.bg).toBe(-1)
	})

	it('renders shape handles for a selected line without throwing', () => {
		const editor = ctx.editor
		const id = createShapeId()
		editor.createShape({
			id,
			type: 'line',
			x: 0,
			y: 0,
			props: {
				points: {
					a1: { id: 'a1', index: 'a1' as IndexKey, x: 0, y: 0 },
					a2: { id: 'a2', index: 'a2' as IndexKey, x: 200, y: 100 },
				},
			},
		})
		editor.select(id)
		expect(() => render()).not.toThrow()
		expect(count('●')).toBeGreaterThanOrEqual(2)
	})

	it('draws grid dots at the pitch of the smallest step that is 4 cols and 2 rows apart', () => {
		const editor = ctx.editor
		editor.updateInstanceState({ isGridMode: true })
		screen.clear()
		renderGrid(editor, screen, ctx.layout.canvas, opts)
		// gridSize 10 × step 4 × zoom 1 = 40 px: every 5 columns, every 2.5 rows.
		expect(screen.getCell(0, 1)!.glyph).toBe('·')
		expect(screen.getCell(5, 1)!.glyph).toBe('·')
		expect(screen.getCell(1, 1)!.glyph).toBe(' ')
		expect(screen.getCell(5, 3)!.glyph).toBe('·')
		expect(screen.getCell(5, 2)!.glyph).toBe(' ')
		expect(screen.getCell(5, 6)!.glyph).toBe('·')
		expect(screen.getCell(5, 1)!.style.fg).toBe(parseColor('hsl(0, 0%, 43%)')!.rgb)
		// Dots never overwrite shapes.
		editor.createShape({ type: 'geo', x: 0, y: 0, props: { w: 400, h: 200, fill: 'solid' } })
		render()
		expect(screen.getCell(5, 3)!.glyph).toBe(' ')
		expect(screen.getCell(5, 1)!.glyph).toBe('─')
		// Zooming out picks a coarser step: at 50% step 4 is 2.5 cols, so step 16 (10 cols) wins.
		editor.setCamera({ x: 0, y: 0, z: 0.5 })
		editor.updateInstanceState({ isGridMode: true })
		screen.clear()
		renderGrid(editor, screen, ctx.layout.canvas, opts)
		expect(screen.getCell(5, 1)!.glyph).toBe(' ')
		expect(screen.getCell(10, 1)!.glyph).toBe('·')
		expect(screen.getCell(10, 6)!.glyph).toBe('·')
	})

	it('keeps grid dots off every cell something drew on, without reading cells back', () => {
		const editor = ctx.editor
		editor.updateInstanceState({ isGridMode: true })
		screen.clear()
		// At zoom 1 the dots land on columns 0, 5, 10, … of row 1.
		screen.put(5, 1, ' ', { fg: 0xff0000 }) // a space inside a label
		screen.blendBg(10, 1, 0x0000ff, 0.1) // the brush
		screen.line(15, 1, LINE_E | LINE_W, { fg: 0, weight: 'light' }) // an unresolved box edge
		const getCell = vi.spyOn(screen, 'getCell')
		renderGrid(editor, screen, ctx.layout.canvas, opts)
		expect(getCell).not.toHaveBeenCalled()
		expect(screen.getCell(0, 1)!.glyph).toBe('·')
		expect(screen.getCell(5, 1)!.glyph).toBe(' ')
		expect(screen.getCell(10, 1)!.glyph).toBe(' ')
		expect(screen.getCell(15, 1)!.glyph).toBe('─')
		expect(screen.getCell(20, 1)!.glyph).toBe('·')
	})

	it('draws the cursor glyph in pointer mode and for non-default cursors', () => {
		opts.pointerCell = { col: 5, row: 5 }
		opts.pointerMode = true
		render()
		expect(screen.getCell(5, 5)!.glyph).toBe(ctx.glyphs.cursorCross)
		expect(screen.getCell(5, 5)!.style.inverse).toBe(true)

		opts.pointerMode = false
		render()
		expect(screen.getCell(5, 5)!.glyph).toBe(' ')

		ctx.editor.setCursor({ type: 'ew-resize', rotation: 0 })
		render()
		expect(screen.getCell(5, 5)!.glyph).toBe(ctx.glyphs.cursorEw)
		ctx.editor.setCursor({ type: 'ew-resize', rotation: Math.PI / 2 })
		render()
		expect(screen.getCell(5, 5)!.glyph).toBe(ctx.glyphs.cursorNs)
		ctx.editor.setCursor({ type: 'nwse-resize', rotation: Math.PI / 2 })
		render()
		expect(screen.getCell(5, 5)!.glyph).toBe(ctx.glyphs.cursorNesw)
		ctx.editor.setCursor({ type: 'grab', rotation: 0 })
		render()
		expect(screen.getCell(5, 5)!.glyph).toBe(ctx.glyphs.cursorGrab)

		opts.showCursorGlyph = false
		render()
		expect(screen.getCell(5, 5)!.glyph).toBe(' ')
		// Over the chrome the glyph is not drawn.
		opts.pointerMode = true
		opts.pointerCell = { col: 5, row: 0 }
		render()
		expect(screen.getCell(5, 0)!.glyph).toBe(' ')
	})

	it('returns the caret cell of the shape being edited', () => {
		const id = createShapeId()
		ctx.editor.createShape({
			id,
			type: 'text',
			x: 80,
			y: 32,
			props: { richText: toRichText('hello') },
		})
		opts.editCaret = { shapeId: id, caret: 3, selectAll: false }
		expect(render().caretCell).toEqual({ col: 13, row: 3 })
		expect(screen.getCell(11, 3)!.style.inverse).toBeUndefined()
		// A select-all shows as inverse video over the label cells.
		opts.editCaret = { shapeId: id, caret: 5, selectAll: true }
		render()
		expect(screen.toText().split('\n')[3]).toContain('hello')
		expect(screen.getCell(10, 3)!.style.inverse).toBe(true)
		expect(screen.getCell(14, 3)!.style.inverse).toBe(true)
		expect(screen.getCell(15, 3)!.style.inverse).toBeUndefined()
		opts.editCaret = null
		expect(render().caretCell).toBeNull()
	})
})
