import { createShapeId, toRichText } from '@tldraw/tlschema'
import { IndexKey } from '@tldraw/utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parseColor } from '../terminal/colors'
import { Screen } from '../terminal/Screen'
import { TestContext, createTestContext } from '../test/testContext'
import { OverlayRenderOptions, renderGrid, renderOverlays } from './renderOverlays'
import { renderShapes } from './renderShapes'

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
		// The indicator re-strokes the outline in the selection colour.
		expect(screen.getCell(12, 1)!.glyph).toBe('─')
		expect(screen.getCell(12, 1)!.style.fg).toBe(parseColor('hsl(214, 84%, 56%)')!.rgb)
		// The label survives the indicator pass.
		expect(screen.toText().split('\n')[4]).toContain('Hello')
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
		opts.editCaret = { shapeId: id, caret: 3 }
		expect(render().caretCell).toEqual({ col: 13, row: 3 })
		opts.editCaret = null
		expect(render().caretCell).toBeNull()
	})
})
