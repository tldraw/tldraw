import { EffectScheduler } from '@tldraw/state'
import { b64Vecs, createShapeId, toRichText } from '@tldraw/tlschema'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parseColor } from '../terminal/colors'
import { Screen } from '../terminal/Screen'
import { TestContext, createTestContext } from '../test/testContext'
import { RenderOptions, caretLineAndColumn, locateCaret, renderShapes } from './renderShapes'

const WHITE = 0xffffff

function isBraille(glyph: string) {
	const cp = glyph.codePointAt(0) ?? 0
	return cp >= 0x2801 && cp <= 0x28ff
}

describe('renderShapes', () => {
	let ctx: TestContext
	let screen: Screen
	let opts: RenderOptions

	beforeEach(() => {
		ctx = createTestContext()
		screen = new Screen(100, 30, { background: WHITE })
		opts = { glyphs: ctx.glyphs, colorMode: 'light', stroke: 'braille', background: WHITE }
	})

	afterEach(() => {
		ctx.dispose()
	})

	function render() {
		screen.clear()
		return renderShapes(ctx.editor, screen, ctx.layout.canvas, opts)
	}

	it('renders a 200x100 rect at zoom 1 as a box frame with its label centred', () => {
		ctx.editor.createShape({
			type: 'geo',
			x: 0,
			y: 0,
			props: { geo: 'rectangle', w: 200, h: 100, richText: toRichText('Hello') },
		})
		expect(render().rendered).toBe(1)
		// The canvas starts on row 1; 200 × 100 px is 25 cols × 6.25 rows.
		expect(screen.getCell(0, 1)!.glyph).toBe('┌')
		expect(screen.getCell(25, 1)!.glyph).toBe('┐')
		expect(screen.getCell(0, 7)!.glyph).toBe('└')
		expect(screen.getCell(25, 7)!.glyph).toBe('┘')
		expect(screen.getCell(12, 1)!.glyph).toBe('─')
		expect(screen.getCell(0, 4)!.glyph).toBe('│')
		expect(screen.getCell(25, 4)!.glyph).toBe('│')
		const lines = screen.toText().split('\n')
		expect(lines[4].indexOf('Hello')).toBe(10)
		expect(lines[1]).toBe('┌' + '─'.repeat(24) + '┐')
		// Black labels take the theme text colour; the outline is the colour's solid variant.
		expect(screen.getCell(10, 4)!.style.fg).toBe(0x000000)
		expect(screen.getCell(12, 1)!.style.fg).toBe(parseColor('#1d1d1d')!.rgb)
	})

	it('renders dashed and heavy variants and hides the outline for dash none', () => {
		const editor = ctx.editor
		const dashed = createShapeId()
		const heavy = createShapeId()
		const none = createShapeId()
		editor.createShapes([
			{ id: dashed, type: 'geo', x: 0, y: 0, props: { w: 160, h: 64, dash: 'dashed' } },
			{ id: heavy, type: 'geo', x: 240, y: 0, props: { w: 160, h: 64, size: 'xl' } },
			{ id: none, type: 'geo', x: 480, y: 0, props: { w: 160, h: 64, dash: 'none' } },
		])
		render()
		expect(screen.getCell(10, 1)!.glyph).toBe('╌')
		expect(screen.getCell(0, 3)!.glyph).toBe('╎')
		expect(screen.getCell(30, 1)!.glyph).toBe('┏')
		expect(screen.getCell(40, 1)!.glyph).toBe('━')
		expect(screen.getCell(60, 1)!.glyph).toBe(' ')
		expect(screen.getCell(70, 1)!.glyph).toBe(' ')
	})

	it('renders an ellipse with sub-cell glyphs inside its bounds and no box lines', () => {
		ctx.editor.createShape({
			type: 'geo',
			x: 0,
			y: 0,
			props: { geo: 'ellipse', w: 240, h: 160 },
		})
		render()
		const text = screen.toText()
		expect([...text].filter(isBraille).length).toBeGreaterThan(20)
		expect(text).not.toMatch(/[─│┌┐└┘]/)
		// Nothing outside the 30 × 10 cell bounds (rows 1..11).
		expect(screen.getCell(31, 5)!.glyph).toBe(' ')
		expect(screen.getCell(15, 12)!.glyph).toBe(' ')
	})

	it('fills geo shapes: solid sets the semi variant, pattern draws shade glyphs', () => {
		ctx.editor.createShapes([
			{
				type: 'geo',
				x: 0,
				y: 0,
				props: { w: 160, h: 64, fill: 'solid', color: 'blue' },
			},
			{
				type: 'geo',
				x: 240,
				y: 0,
				props: { w: 160, h: 64, fill: 'pattern', color: 'red' },
			},
			{
				type: 'geo',
				x: 480,
				y: 0,
				props: { w: 160, h: 64, fill: 'fill', color: 'green', richText: toRichText('go') },
			},
		])
		render()
		expect(screen.getCell(10, 3)!.style.bg).toBe(parseColor('#dce1f8')!.rgb)
		expect(screen.getCell(40, 3)!.glyph).toBe('░')
		expect(screen.getCell(40, 3)!.style.bg).toBe(-1)
		// A 'fill' fill paints the colour's fill variant; the label keeps its own labelColor, as in
		// GeoShapeUtil (a black label follows the theme text colour).
		expect(screen.getCell(70, 3)!.style.bg).toBe(parseColor('#099268')!.rgb)
		const row = screen.toText().split('\n')[3]
		const col = row.indexOf('go')
		expect(col).toBeGreaterThan(60)
		expect(screen.getCell(col, 3)!.style.fg).toBe(
			parseColor(ctx.editor.getCurrentTheme().colors.light.text)!.rgb
		)
	})

	it('renders a straight axis-aligned arrow with box glyphs and an arrowhead', () => {
		ctx.editor.createShape({
			type: 'arrow',
			x: 0,
			y: 0,
			props: { start: { x: 100, y: 50 }, end: { x: 300, y: 50 }, arrowheadEnd: 'arrow' },
		})
		render()
		const row = screen.toText().split('\n')[4]
		expect(row).toMatch(/─{10,}/)
		expect(row.trimEnd().endsWith('►')).toBe(true)
		expect(row.indexOf('►')).toBeGreaterThanOrEqual(34)
	})

	it('renders arrows bound between two rects with heads at both ends', () => {
		const editor = ctx.editor
		const a = createShapeId()
		const b = createShapeId()
		editor.createShapes([
			{ id: a, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
			{ id: b, type: 'geo', x: 400, y: 0, props: { w: 100, h: 100 } },
		])
		const arrow = createShapeId()
		editor.createShape({
			id: arrow,
			type: 'arrow',
			x: 0,
			y: 0,
			props: {
				start: { x: 50, y: 50 },
				end: { x: 450, y: 50 },
				arrowheadStart: 'dot',
				arrowheadEnd: 'arrow',
			},
		})
		editor.createBindings([
			{
				type: 'arrow',
				fromId: arrow,
				toId: a,
				props: {
					terminal: 'start',
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isExact: false,
					isPrecise: false,
					snap: 'none',
				},
			},
			{
				type: 'arrow',
				fromId: arrow,
				toId: b,
				props: {
					terminal: 'end',
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isExact: false,
					isPrecise: false,
					snap: 'none',
				},
			},
		])
		expect(render().rendered).toBe(3)
		const row = screen.toText().split('\n')[4]
		expect(row).toContain('●')
		expect(row).toContain('►')
		expect(row.indexOf('●')).toBeLessThan(row.indexOf('►'))
		expect(row).toMatch(/─{5,}/)
	})

	it('renders an elbow arrow route with box corners', () => {
		ctx.editor.createShape({
			type: 'arrow',
			x: 0,
			y: 0,
			props: { kind: 'elbow', start: { x: 0, y: 0 }, end: { x: 240, y: 160 } },
		})
		render()
		const text = screen.toText()
		expect(text).toMatch(/[┐┌└┘]/)
		expect(text).toContain('─')
		expect(text).toContain('│')
	})

	it('renders a text shape at its position with the text colour', () => {
		ctx.editor.createShape({
			type: 'text',
			x: 80,
			y: 32,
			props: { richText: toRichText('hi there'), color: 'red' },
		})
		render()
		const row = screen.toText().split('\n')[3]
		expect(row.indexOf('hi there')).toBe(10)
		expect(screen.getCell(10, 3)!.style.fg).toBe(parseColor('#e03131')!.rgb)
	})

	it('renders a note with its fill colour, border and label', () => {
		ctx.editor.createShape({
			type: 'note',
			x: 0,
			y: 0,
			props: { richText: toRichText('todo'), color: 'yellow' },
		})
		render()
		expect(screen.getCell(12, 7)!.style.bg).toBe(parseColor('#FED49A')!.rgb)
		expect(screen.getCell(0, 1)!.glyph).toBe('┌')
		expect(screen.getCell(0, 1)!.style.fg).toBe(parseColor('rgb(144, 144, 144)')!.rgb)
		expect(screen.toText()).toContain('todo')
	})

	it('renders a frame with its name above and clips children to the frame', () => {
		const editor = ctx.editor
		const frame = createShapeId()
		editor.createShape({
			id: frame,
			type: 'frame',
			x: 0,
			y: 16,
			props: { w: 160, h: 160, name: 'Plan' },
		})
		editor.createShape({
			type: 'geo',
			x: 100,
			y: 100,
			parentId: frame,
			props: { w: 240, h: 100 },
		})
		expect(render().rendered).toBe(2)
		const lines = screen.toText().split('\n')
		expect(lines[1].indexOf('Plan')).toBe(0)
		// The frame outline: 20 cols × 10 rows from row 2.
		expect(screen.getCell(0, 2)!.glyph).toBe('┌')
		expect(screen.getCell(20, 2)!.glyph).toBe('┐')
		expect(screen.getCell(10, 5)!.style.bg).toBe(WHITE)
		// The child (cols 12..42, rows 8..14 unclipped) keeps only what lies inside the frame.
		expect(screen.getCell(15, 8)!.glyph).toBe('─')
		expect(screen.getCell(12, 10)!.glyph).toBe('│')
		for (let col = 21; col < 45; col++) {
			for (let row = 2; row < 15; row++) expect(screen.getCell(col, row)!.glyph).toBe(' ')
		}
		for (let col = 12; col < 21; col++) expect(screen.getCell(col, 13)!.glyph).toBe(' ')
	})

	it('renders draw shapes as sub-cell strokes and dots as a single glyph', () => {
		const editor = ctx.editor
		editor.createShapes([
			{
				type: 'draw',
				x: 0,
				y: 0,
				props: {
					segments: [
						{
							type: 'free',
							path: b64Vecs.encodePoints([
								{ x: 0, y: 0, z: 0.5 },
								{ x: 60, y: 40, z: 0.5 },
								{ x: 120, y: 100, z: 0.5 },
								{ x: 200, y: 120, z: 0.5 },
							]),
						},
					],
					isComplete: true,
				},
			},
			{
				type: 'draw',
				x: 400,
				y: 40,
				props: {
					segments: [{ type: 'free', path: b64Vecs.encodePoints([{ x: 0, y: 0, z: 0.5 }]) }],
					isComplete: true,
				},
			},
		])
		render()
		const text = screen.toText()
		expect([...text].filter(isBraille).length).toBeGreaterThan(5)
		expect(text).not.toMatch(/[─│┌┐└┘]/)
		expect(text).toContain('●')
	})

	it('renders highlights as a blended band and placeholders for images', () => {
		const editor = ctx.editor
		editor.createShapes([
			{
				type: 'highlight',
				x: 0,
				y: 0,
				props: {
					segments: [
						{
							type: 'free',
							path: b64Vecs.encodePoints([
								{ x: 0, y: 40, z: 0.5 },
								{ x: 200, y: 40, z: 0.5 },
							]),
						},
					],
					isComplete: true,
				},
			},
			{ type: 'bookmark', x: 400, y: 0, props: { w: 160, h: 96, url: 'https://tldraw.dev/docs' } },
		])
		render()
		const bg = screen.getCell(12, 3)!.style.bg
		expect(bg).not.toBe(-1)
		expect(bg).not.toBe(WHITE)
		const text = screen.toText()
		expect(text).toContain('[bookmark]')
		expect(text).toContain('tldraw.dev')
		expect(screen.getCell(60, 1)!.glyph).toBe('╌')
	})

	it('dims translucent shapes by fading the stroke toward the background', () => {
		ctx.editor.createShape({ type: 'geo', x: 0, y: 0, opacity: 0.5, props: { w: 160, h: 64 } })
		render()
		const fg = screen.getCell(5, 1)!.style.fg
		expect(fg).not.toBe(parseColor('#1d1d1d')!.rgb)
		expect(fg).toBeGreaterThan(0x707070)
	})

	it('skips culled shapes and shapes outside the canvas rect', () => {
		const editor = ctx.editor
		editor.createShapes([
			{ type: 'geo', x: 0, y: 0, props: { w: 160, h: 64 } },
			{ type: 'geo', x: 100000, y: 100000, props: { w: 160, h: 64 } },
		])
		expect(render().rendered).toBe(1)
		expect(editor.getCulledShapes().size).toBe(1)
		// Explicit shape lists skip the culling set but still cull against the canvas.
		const all = editor.getCurrentPageShapesSorted()
		screen.clear()
		expect(renderShapes(editor, screen, ctx.layout.canvas, { ...opts, shapes: all }).rendered).toBe(
			1
		)
	})

	it('renders with an explicit camera', () => {
		ctx.editor.createShape({ type: 'geo', x: 1000, y: 1000, props: { w: 200, h: 100 } })
		screen.clear()
		renderShapes(ctx.editor, screen, ctx.layout.canvas, {
			...opts,
			camera: { x: -1000, y: -1000, z: 0.5 },
			shapes: ctx.editor.getCurrentPageShapesSorted(),
		})
		expect(screen.getCell(0, 1)!.glyph).toBe('┌')
		expect(screen.getCell(12, 1)!.glyph).toBe('┐')
		expect(screen.getCell(0, 4)!.glyph).toBe('└')
	})

	it('reads geometry without capturing it: the render effect stays coarse', () => {
		const editor = ctx.editor
		const shapes = []
		for (let i = 0; i < 200; i++) {
			shapes.push({
				id: createShapeId(),
				type: 'geo' as const,
				x: (i % 20) * 40,
				y: Math.floor(i / 20) * 40,
				props: { w: 30, h: 30, richText: toRichText(String(i)) },
			})
		}
		editor.createShapes(shapes)
		let runs = 0
		const effect = new EffectScheduler('render test', () => {
			runs++
			render()
		})
		effect.attach()
		effect.execute()
		expect(runs).toBe(1)
		expect(effect.parents.length).toBeLessThan(20)
		editor.updateShape({ id: shapes[0].id, type: 'geo', x: 5 })
		expect(runs).toBe(2)
		editor.setCamera({ x: -10, y: 0, z: 1 })
		expect(runs).toBe(3)
		effect.detach()
	})

	it('reuses cached polylines for unchanged shapes', () => {
		const editor = ctx.editor
		const moving = createShapeId()
		editor.createShapes([
			{ id: moving, type: 'geo', x: 0, y: 0, props: { w: 160, h: 64 } },
			{ type: 'geo', x: 300, y: 0, props: { w: 160, h: 64 } },
		])
		render()
		const before = screen.toText()
		editor.updateShape({ id: moving, type: 'geo', x: 16 })
		render()
		const after = screen.toText().split('\n')
		expect(after[1].indexOf('┌')).toBe(2)
		expect(after[1].lastIndexOf('┌')).toBe(before.split('\n')[1].lastIndexOf('┌'))
	})

	describe('caret', () => {
		it('maps caret indices onto wrapped lines', () => {
			expect(caretLineAndColumn('hello world', ['hello', 'world'], 3)).toEqual({
				line: 0,
				column: 3,
			})
			expect(caretLineAndColumn('hello world', ['hello', 'world'], 5)).toEqual({
				line: 0,
				column: 5,
			})
			expect(caretLineAndColumn('hello world', ['hello', 'world'], 6)).toEqual({
				line: 1,
				column: 0,
			})
			expect(caretLineAndColumn('hello world', ['hello', 'world'], 11)).toEqual({
				line: 1,
				column: 5,
			})
			expect(caretLineAndColumn('a\n\nb', ['a', '', 'b'], 2)).toEqual({ line: 1, column: 0 })
			expect(caretLineAndColumn('a\n\nb', ['a', '', 'b'], 3)).toEqual({ line: 2, column: 0 })
			expect(caretLineAndColumn('abcdef', ['ab…'], 6)).toEqual({ line: 0, column: 2 })
			expect(caretLineAndColumn('', [''], 0)).toEqual({ line: 0, column: 0 })
		})

		it('locates the caret cell of a text shape and a geo label', () => {
			const editor = ctx.editor
			const text = createShapeId()
			const geo = createShapeId()
			editor.createShapes([
				{ id: text, type: 'text', x: 80, y: 32, props: { richText: toRichText('hello') } },
				{
					id: geo,
					type: 'geo',
					x: 0,
					y: 160,
					props: { w: 200, h: 100, richText: toRichText('Hello') },
				},
			])
			render()
			expect(
				locateCaret(editor, screen, ctx.layout.canvas, opts, {
					shapeId: text,
					caret: 2,
					selectAll: false,
				})
			).toEqual({
				col: 12,
				row: 3,
			})
			expect(
				locateCaret(editor, screen, ctx.layout.canvas, opts, {
					shapeId: geo,
					caret: 5,
					selectAll: false,
				})
			).toEqual({
				col: 15,
				row: 14,
			})
			expect(
				locateCaret(editor, screen, ctx.layout.canvas, opts, {
					shapeId: createShapeId(),
					caret: 0,
					selectAll: false,
				})
			).toBeNull()
		})
	})
})
