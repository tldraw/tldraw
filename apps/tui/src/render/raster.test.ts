import { describe, expect, it } from 'vitest'
import { getGlyphs } from '../terminal/chars'
import { Screen } from '../terminal/Screen'
import {
	CellMask,
	FillSink,
	Poly,
	ScanlineFiller,
	SubCellRaster,
	drawLineRun,
	getTextMask,
	pointInPolysEvenOdd,
	pointInPolysNonZero,
	polyBounds,
	strokePolyline,
} from './raster'

const glyphs = getGlyphs('rich')
const light = { fg: 0x333333, weight: 'light' as const }

function poly(...coords: number[]): Poly {
	return { points: coords, count: coords.length / 2 }
}

function isBraille(glyph: string) {
	const cp = glyph.codePointAt(0) ?? 0
	return cp >= 0x2801 && cp <= 0x28ff
}

class CountingSink implements FillSink {
	cells = new Set<string>()
	fillCell(col: number, row: number) {
		this.cells.add(`${col},${row}`)
	}
}

describe('SubCellRaster', () => {
	it('rasterizes a diagonal into braille cells along the line', () => {
		const screen = new Screen(10, 10)
		const raster = new SubCellRaster('braille', glyphs)
		raster.resize(10, 10)
		raster.line(0, 0, 3, 3)
		raster.flush(screen, { fg: 0xff0000 })
		for (let i = 0; i < 3; i++) {
			const cell = screen.getCell(i, i)!
			expect(isBraille(cell.glyph)).toBe(true)
			expect(cell.style.fg).toBe(0xff0000)
		}
		expect(screen.getCell(3, 0)!.glyph).toBe(' ')
		expect(raster.isEmpty()).toBe(true)
	})

	it('uses quadrant blocks and ascii diagonals in the other modes', () => {
		const blocks = new Screen(10, 10)
		const b = new SubCellRaster('blocks', glyphs)
		b.resize(10, 10)
		b.line(0.25, 0.25, 0.25, 0.25)
		b.flush(blocks, {})
		expect(blocks.getCell(0, 0)!.glyph).toBe('▘')

		const ascii = new Screen(10, 10)
		const a = new SubCellRaster('ascii', glyphs)
		a.resize(10, 10)
		a.line(0, 0, 4, 2)
		a.flush(ascii, {})
		expect(ascii.getCell(0, 0)!.glyph).toBe('\\')
		a.line(0, 5, 6, 5)
		a.flush(ascii, {})
		expect(ascii.getCell(3, 5)!.glyph).toBe('-')
	})

	it('clips long segments to the raster before stepping', () => {
		const screen = new Screen(10, 10)
		const raster = new SubCellRaster('braille', glyphs)
		raster.resize(10, 10)
		const start = performance.now()
		raster.line(-1e6, 5, 1e6, 5)
		expect(performance.now() - start).toBeLessThan(50)
		raster.flush(screen, {})
		expect(isBraille(screen.getCell(5, 5)!.glyph)).toBe(true)
	})

	it('skips dots for dashed strokes and thickens heavy ones', () => {
		const dashed = new Screen(20, 4)
		const raster = new SubCellRaster('braille', glyphs)
		raster.resize(20, 4)
		raster.line(0, 1.5, 20, 3.5, false, 1)
		raster.flush(dashed, {})
		const dashedText = dashed.toText()
		const solid = new Screen(20, 4)
		raster.line(0, 1.5, 20, 3.5, true, 0)
		raster.flush(solid, {})
		const dots = (s: string) => [...s].filter(isBraille).length
		expect(dots(dashedText)).toBeGreaterThan(0)
		expect(dots(dashedText)).toBeLessThan(dots(solid.toText()))
	})
})

describe('drawLineRun and strokePolyline', () => {
	it('joins consecutive runs into corners through the mask layer', () => {
		const screen = new Screen(10, 10)
		drawLineRun(screen, 0, 0, 3, 0, true, light)
		expect(screen.getCell(0, 0)!.glyph).toBe('╶')
		expect(screen.getCell(1, 0)!.glyph).toBe('─')
		expect(screen.getCell(3, 0)!.glyph).toBe('╴')
		drawLineRun(screen, 3, 0, 3, 2, false, light)
		expect(screen.getCell(3, 0)!.glyph).toBe('┐')
		expect(screen.getCell(3, 1)!.glyph).toBe('│')
		expect(screen.getCell(3, 2)!.glyph).toBe('╵')
	})

	it('strokes a closed rectangle with four corners and respects a visibility test', () => {
		const screen = new Screen(12, 6)
		const raster = new SubCellRaster('braille', glyphs)
		raster.resize(12, 6)
		strokePolyline(screen, raster, poly(0, 0, 10, 0, 10, 4, 0, 4), true, 'auto', light, {})
		expect(screen.getCell(0, 0)!.glyph).toBe('┌')
		expect(screen.getCell(10, 0)!.glyph).toBe('┐')
		expect(screen.getCell(10, 4)!.glyph).toBe('┘')
		expect(screen.getCell(0, 4)!.glyph).toBe('└')
		expect(screen.getCell(5, 0)!.glyph).toBe('─')
		expect(screen.getCell(0, 2)!.glyph).toBe('│')

		const clipped = new Screen(12, 6)
		strokePolyline(clipped, raster, poly(0, 0, 10, 0), false, 'auto', light, {}, (col) => col !== 5)
		expect(clipped.getCell(4, 0)!.glyph).toBe('─')
		expect(clipped.getCell(5, 0)!.glyph).toBe(' ')
	})

	it('keeps a near-axis segment connected when it steps across a row', () => {
		const screen = new Screen(12, 6)
		const raster = new SubCellRaster('braille', glyphs)
		raster.resize(12, 6)
		strokePolyline(screen, raster, poly(0, 0.9, 8, 1.2), false, 'auto', light, {})
		// The run lands on row 0 and steps down to row 1 at its end.
		expect(screen.getCell(4, 0)!.glyph).toBe('─')
		expect(screen.getCell(8, 1)!.glyph).not.toBe(' ')
	})

	it('draws diagonal segments as sub-cell glyphs and axis ones as box lines in auto mode', () => {
		const screen = new Screen(12, 6)
		const raster = new SubCellRaster('braille', glyphs)
		raster.resize(12, 6)
		strokePolyline(screen, raster, poly(0, 3, 6, 0), false, 'auto', light, {})
		strokePolyline(screen, raster, poly(0, 0, 6, 0, 6, 3, 0, 3), true, 'auto', light, {})
		expect(screen.getCell(3, 0)!.glyph).toBe('─')
		expect(isBraille(screen.getCell(3, 1)!.glyph) || isBraille(screen.getCell(2, 2)!.glyph)).toBe(
			true
		)
		// The later stroke wins a shared cell: the box corner replaces the diagonal's dots.
		expect(screen.getCell(6, 0)!.glyph).toBe('┐')
	})

	it('strokes a mostly curved polyline entirely with sub-cell glyphs', () => {
		const screen = new Screen(30, 15)
		const raster = new SubCellRaster('braille', glyphs)
		raster.resize(30, 15)
		const coords: number[] = []
		for (let i = 0; i < 64; i++) {
			const a = (i / 64) * Math.PI * 2
			coords.push(15 + 12 * Math.cos(a), 7 + 6 * Math.sin(a))
		}
		strokePolyline(screen, raster, poly(...coords), true, 'auto', light, {})
		const text = screen.toText()
		expect([...text].filter(isBraille).length).toBeGreaterThan(20)
		expect(text).not.toMatch(/[─│┌┐└┘╶╴╵╷]/)
	})
})

describe('ScanlineFiller', () => {
	it('fills the cells whose centres lie inside the polygon', () => {
		const filler = new ScanlineFiller()
		const sink = new CountingSink()
		filler.fill([poly(1, 1, 5, 1, 5, 4, 1, 4)], 'nonzero', { x: 0, y: 0, w: 20, h: 20 }, sink)
		expect(sink.cells.size).toBe(12)
		expect(sink.cells.has('1,1')).toBe(true)
		expect(sink.cells.has('4,3')).toBe(true)
		expect(sink.cells.has('5,1')).toBe(false)
	})

	it('honours the even-odd rule for holes and the clip rect', () => {
		const filler = new ScanlineFiller()
		const outer = poly(0, 0, 10, 0, 10, 10, 0, 10)
		const inner = poly(3, 3, 7, 3, 7, 7, 3, 7)
		const evenOdd = new CountingSink()
		filler.fill([outer, inner], 'evenodd', { x: 0, y: 0, w: 20, h: 20 }, evenOdd)
		expect(evenOdd.cells.size).toBe(100 - 16)
		expect(evenOdd.cells.has('5,5')).toBe(false)
		const nonZero = new CountingSink()
		filler.fill([outer, inner], 'nonzero', { x: 0, y: 0, w: 20, h: 20 }, nonZero)
		expect(nonZero.cells.size).toBe(100)
		const clipped = new CountingSink()
		filler.fill([outer], 'nonzero', { x: 2, y: 2, w: 3, h: 3 }, clipped)
		expect(clipped.cells.size).toBe(9)
	})

	it('point tests agree with the fill rules', () => {
		const outer = poly(0, 0, 10, 0, 10, 10, 0, 10)
		const inner = poly(3, 3, 7, 3, 7, 7, 3, 7)
		expect(pointInPolysEvenOdd(5, 5, [outer, inner])).toBe(false)
		expect(pointInPolysEvenOdd(1, 1, [outer, inner])).toBe(true)
		expect(pointInPolysNonZero(5, 5, [outer, inner])).toBe(true)
		expect(pointInPolysNonZero(11, 5, [outer])).toBe(false)
		const bounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 }
		expect(polyBounds([outer, inner], bounds)).toBe(true)
		expect(bounds).toEqual({ minX: 0, minY: 0, maxX: 10, maxY: 10 })
		expect(polyBounds([], bounds)).toBe(false)
	})
})

describe('CellMask', () => {
	it('tracks cells and clears only what was touched', () => {
		const mask = new CellMask(10, 5)
		mask.set(3, 2)
		mask.set(30, 2)
		expect(mask.has(3, 2)).toBe(true)
		expect(mask.has(30, 2)).toBe(false)
		mask.clear()
		expect(mask.has(3, 2)).toBe(false)
		const screen = new Screen(10, 5)
		const shared = getTextMask(screen)
		expect(getTextMask(screen)).toBe(shared)
		expect(shared.cols).toBe(10)
	})
})
