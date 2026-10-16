import { describe, expect, it } from 'vitest'
import { Path2DPolyfill } from '../bootstrap/path2d'
import { parseColor } from '../terminal/colors'
import { Screen } from '../terminal/Screen'
import { CellMask } from './raster'
import { TerminalCanvas } from './TerminalCanvas'

const WHITE = 0xffffff

function setup(cols = 20, rows = 10, stroke: 'braille' | 'blocks' | 'ascii' = 'braille') {
	// The screen blends translucent fills over its own background; the App passes the same value.
	const screen = new Screen(cols, rows, { background: WHITE })
	const ctx = new TerminalCanvas(
		screen,
		{ x: 0, y: 0, w: cols, h: rows },
		{
			background: WHITE,
			stroke,
		}
	)
	return { screen, ctx }
}

function isBraille(glyph: string) {
	const cp = glyph.codePointAt(0) ?? 0
	return cp >= 0x2801 && cp <= 0x28ff
}

describe('TerminalCanvas', () => {
	it('strokes an axis-aligned rect as box-drawing glyphs in the stroke colour', () => {
		const { screen, ctx } = setup()
		ctx.strokeStyle = 'hsl(214, 84%, 56%)'
		ctx.strokeRect(0, 0, 80, 32)
		expect(screen.getCell(0, 0)!.glyph).toBe('┌')
		expect(screen.getCell(10, 0)!.glyph).toBe('┐')
		expect(screen.getCell(0, 2)!.glyph).toBe('└')
		expect(screen.getCell(10, 2)!.glyph).toBe('┘')
		expect(screen.getCell(5, 0)!.glyph).toBe('─')
		expect(screen.getCell(0, 1)!.glyph).toBe('│')
		expect(screen.getCell(5, 0)!.style.fg).toBe(parseColor('hsl(214, 84%, 56%)')!.rgb)
	})

	it('applies the transform: translate, scale and rotate', () => {
		const { screen, ctx } = setup()
		ctx.setTransform(2, 0, 0, 2, 16, 32)
		ctx.strokeRect(0, 0, 20, 8)
		// 20 × 8 at scale 2 is 40 × 16 px starting at (16, 32): cols 2..7, rows 2..3.
		expect(screen.getCell(2, 2)!.glyph).toBe('┌')
		expect(screen.getCell(7, 3)!.glyph).toBe('┘')

		const rotated = setup()
		rotated.ctx.translate(80, 80)
		rotated.ctx.rotate(Math.PI / 4)
		rotated.ctx.beginPath()
		rotated.ctx.moveTo(-40, 0)
		rotated.ctx.lineTo(40, 0)
		rotated.ctx.stroke()
		const text = rotated.screen.toText()
		expect([...text].some(isBraille)).toBe(true)
		expect(text).not.toContain('─')
	})

	it('turns a fill smaller than a cell into one glyph: squares for rects, dots for arcs', () => {
		const { screen, ctx } = setup()
		ctx.fillStyle = '#ffffff'
		ctx.strokeStyle = '#4465e9'
		ctx.fillRect(10, 10, 4, 4)
		ctx.strokeRect(10, 10, 4, 4)
		expect(screen.getCell(1, 0)!.glyph).toBe('■')

		ctx.beginPath()
		ctx.arc(44, 40, 2, 0, Math.PI * 2)
		ctx.fill()
		ctx.stroke()
		expect(screen.getCell(5, 2)!.glyph).toBe('●')

		// A half disc (note clone handle), facing right.
		ctx.beginPath()
		ctx.moveTo(100, 69)
		ctx.arc(100, 72, 3, -Math.PI / 2, Math.PI / 2)
		ctx.closePath()
		ctx.fill()
		expect(screen.getCell(12, 4)!.glyph).toBe('◗')
	})

	it('strokes a large arc as sub-cell glyphs with no box lines', () => {
		const { screen, ctx } = setup(40, 20)
		ctx.beginPath()
		ctx.arc(160, 160, 100, 0, Math.PI * 2)
		ctx.stroke()
		const text = screen.toText()
		expect([...text].filter(isBraille).length).toBeGreaterThan(20)
		expect(text).not.toMatch(/[─│┌┐└┘]/)
	})

	it('fills large areas by setting backgrounds and blends translucent colours', () => {
		const { screen, ctx } = setup()
		ctx.fillStyle = '#ff0000'
		ctx.fillRect(0, 0, 80, 32)
		expect(screen.getCell(3, 1)!.style.bg).toBe(0xff0000)
		expect(screen.getCell(12, 1)!.style.bg).toBe(-1)

		ctx.fillStyle = 'hsl(0, 0%, 56%, 10.2%)'
		ctx.fillRect(96, 0, 64, 32)
		const bg = screen.getCell(14, 1)!.style.bg
		expect(bg).not.toBe(-1)
		expect(bg).not.toBe(parseColor('hsl(0, 0%, 56%)')!.rgb)
		expect(bg).not.toBe(WHITE)

		ctx.fillStyle = '#00ff00'
		ctx.globalAlpha = 0.5
		ctx.fillRect(0, 64, 80, 32)
		expect(screen.getCell(3, 5)!.style.bg).toBe(0x80ff80)
	})

	it('dims strokes below 30% alpha instead of blending them away', () => {
		const { screen, ctx } = setup()
		ctx.globalAlpha = 0.16
		ctx.strokeStyle = '#000000'
		ctx.strokeRect(0, 0, 80, 32)
		// Box lines cannot carry the dim attribute, so they fade toward the background instead.
		expect(screen.getCell(5, 0)!.style.fg).toBe(0x808080)
		ctx.beginPath()
		ctx.moveTo(0, 48)
		ctx.lineTo(80, 80)
		ctx.stroke()
		expect(screen.getCell(2, 3)!.style.dim).toBe(true)
	})

	it('uses heavy lines for thick strokes and dashed lines for a dash array', () => {
		const { screen, ctx } = setup()
		ctx.lineWidth = 3
		ctx.strokeRect(0, 0, 80, 32)
		expect(screen.getCell(0, 0)!.glyph).toBe('┏')
		expect(screen.getCell(5, 0)!.glyph).toBe('━')

		const dashed = setup()
		dashed.ctx.setLineDash([4, 4])
		expect(dashed.ctx.getLineDash()).toEqual([4, 4])
		dashed.ctx.strokeRect(0, 0, 80, 32)
		expect(dashed.screen.getCell(5, 0)!.glyph).toBe('╌')
		expect(dashed.screen.getCell(0, 1)!.glyph).toBe('╎')
	})

	it('clips with a real even-odd test per cell', () => {
		const { screen, ctx } = setup()
		ctx.save()
		ctx.beginPath()
		ctx.rect(0, 0, 160, 64)
		ctx.rect(40, 16, 80, 32)
		ctx.clip('evenodd')
		ctx.beginPath()
		ctx.moveTo(0, 40)
		ctx.lineTo(160, 40)
		ctx.stroke()
		ctx.restore()
		expect(screen.getCell(2, 2)!.glyph).toBe('─')
		expect(screen.getCell(17, 2)!.glyph).toBe('─')
		for (let col = 5; col < 15; col++) expect(screen.getCell(col, 2)!.glyph).toBe(' ')
		// The clip is gone after restore.
		ctx.beginPath()
		ctx.moveTo(0, 56)
		ctx.lineTo(160, 56)
		ctx.stroke()
		expect(screen.getCell(10, 3)!.glyph).toBe('─')
	})

	it('accepts Path2D arguments for stroke, fill and clip and caches their flattening', () => {
		const { screen, ctx } = setup()
		const path = new Path2DPolyfill('M0 0 L80 0 L80 32 L0 32 Z')
		ctx.stroke(path)
		expect(screen.getCell(0, 0)!.glyph).toBe('┌')
		expect(screen.getCell(10, 2)!.glyph).toBe('┘')

		const dot = new Path2DPolyfill('M 38,40 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0')
		ctx.fillStyle = 'red'
		ctx.fill(dot)
		expect(screen.getCell(5, 2)!.glyph).toBe('●')

		const clipPath = new Path2DPolyfill()
		clipPath.rect(-100, -100, 1000, 1000)
		clipPath.rect(40, 48, 80, 32)
		ctx.save()
		ctx.clip(clipPath, 'evenodd')
		ctx.beginPath()
		ctx.moveTo(0, 64)
		ctx.lineTo(160, 64)
		ctx.stroke()
		ctx.restore()
		expect(screen.getCell(2, 4)!.glyph).toBe('─')
		expect(screen.getCell(10, 4)!.glyph).toBe(' ')
	})

	it('joins an arc to the current point like a real canvas', () => {
		const { screen, ctx } = setup(40, 20)
		ctx.beginPath()
		ctx.moveTo(0, 40)
		ctx.arc(160, 40, 50, Math.PI, Math.PI * 2)
		ctx.stroke()
		// The straight join from (0, 40) to the arc start (110, 40) is a box run on row 2.
		expect(screen.getCell(5, 2)!.glyph).toBe('─')
	})

	it('places fillText at the nearest cell and measures text in user units', () => {
		const { screen, ctx } = setup()
		ctx.fillStyle = '#000000'
		ctx.fillText('hi', 16, 16)
		expect(screen.getCell(2, 0)!.glyph).toBe('h')
		expect(screen.getCell(3, 0)!.glyph).toBe('i')
		ctx.textBaseline = 'middle'
		ctx.textAlign = 'center'
		ctx.fillText('mid', 80, 40)
		expect(screen.getCell(9, 2)!.glyph).toBe('m')
		expect(ctx.measureText('abcd').width).toBe(32)
		ctx.setTransform(2, 0, 0, 2, 0, 0)
		expect(ctx.measureText('abcd').width).toBe(16)
	})

	it('save/restore round-trips styles, transform and dashes; clearRect is a no-op', () => {
		const { screen, ctx } = setup()
		ctx.fillStyle = '#123456'
		ctx.lineWidth = 4
		ctx.save()
		ctx.fillStyle = '#654321'
		ctx.lineWidth = 1
		ctx.translate(8, 16)
		ctx.setLineDash([2, 2])
		ctx.restore()
		expect(ctx.fillStyle).toBe('#123456')
		expect(ctx.lineWidth).toBe(4)
		expect(ctx.getTransform()).toEqual({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
		expect(ctx.getLineDash()).toEqual([])
		ctx.fillRect(0, 0, 80, 32)
		ctx.clearRect(0, 0, 80, 32)
		expect(screen.getCell(3, 1)!.style.bg).toBe(0x123456)
	})

	it('skips protected (text) cells when stroking lines', () => {
		const screen = new Screen(20, 10)
		const protect = new CellMask(20, 10)
		protect.set(3, 0)
		const ctx = new TerminalCanvas(
			screen,
			{ x: 0, y: 0, w: 20, h: 10 },
			{
				background: WHITE,
				stroke: 'braille',
				protect,
			}
		)
		ctx.strokeRect(0, 0, 80, 32)
		expect(screen.getCell(2, 0)!.glyph).toBe('─')
		expect(screen.getCell(3, 0)!.glyph).toBe(' ')
		expect(screen.getCell(4, 0)!.glyph).toBe('─')
	})

	it('offsets everything by the viewport origin and draws tiny strokes as crosses', () => {
		const screen = new Screen(20, 10)
		const ctx = new TerminalCanvas(
			screen,
			{ x: 2, y: 1, w: 18, h: 9 },
			{
				background: WHITE,
				stroke: 'blocks',
			}
		)
		ctx.strokeRect(0, 0, 80, 32)
		expect(screen.getCell(2, 1)!.glyph).toBe('┌')
		expect(screen.getCell(12, 3)!.glyph).toBe('┘')
		ctx.beginPath()
		ctx.moveTo(118, 78)
		ctx.lineTo(122, 82)
		ctx.moveTo(118, 82)
		ctx.lineTo(122, 78)
		ctx.stroke()
		expect(screen.getCell(2 + 15, 1 + 5)!.glyph).toBe('+')
	})
})
