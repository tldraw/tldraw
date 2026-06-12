import { describe, expect, it } from 'vitest'
import { TextLayer } from '../api/marketingApi'
import { layoutTextLayer } from './textLayerLayout'

const FONTS = { headingFont: 'Archivo', bodyFont: 'Inter' }
const FRAME = { w: 1000, h: 500 }

function layer(overrides: Partial<TextLayer> = {}): TextLayer {
	return {
		text: 'Hello world',
		x: 0.1,
		y: 0.2,
		width: 0.5,
		fontRole: 'heading',
		fontSize: 0.08,
		color: '#ffffff',
		align: 'center',
		weight: 'bold',
		scrim: false,
		...overrides,
	}
}

describe('layoutTextLayer', () => {
	it('resolves normalized position and size against the frame in pixels', () => {
		const t = layoutTextLayer(layer(), FRAME, FONTS)
		expect(t).toMatchObject({
			x: 100, // 0.1 * 1000
			y: 100, // 0.2 * 500
			width: 500, // 0.5 * 1000
			fontSize: 40, // 0.08 * 500
			lineHeight: 46, // fontSize * 1.15
		})
	})

	it('resolves the font role against the brand fonts', () => {
		expect(layoutTextLayer(layer({ fontRole: 'heading' }), FRAME, FONTS).fontFamily).toBe(
			"'Archivo', sans-serif"
		)
		expect(layoutTextLayer(layer({ fontRole: 'body' }), FRAME, FONTS).fontFamily).toBe(
			"'Inter', sans-serif"
		)
	})

	it('maps weight to numeric font weight', () => {
		expect(layoutTextLayer(layer({ weight: 'bold' }), FRAME, FONTS).fontWeight).toBe(700)
		expect(layoutTextLayer(layer({ weight: 'normal' }), FRAME, FONTS).fontWeight).toBe(400)
	})

	it('anchors per alignment', () => {
		const left = layoutTextLayer(layer({ align: 'left' }), FRAME, FONTS)
		expect(left).toMatchObject({ anchor: 'start', anchorX: 100 })

		const center = layoutTextLayer(layer({ align: 'center' }), FRAME, FONTS)
		expect(center).toMatchObject({ anchor: 'middle', anchorX: 350 }) // x + width / 2

		const right = layoutTextLayer(layer({ align: 'right' }), FRAME, FONTS)
		expect(right).toMatchObject({ anchor: 'end', anchorX: 600 }) // x + width
	})

	it('has no scrim when the layer asks for none', () => {
		expect(layoutTextLayer(layer({ scrim: false }), FRAME, FONTS).scrim).toBeNull()
	})

	it('picks a dark scrim behind light text and a light scrim behind dark text', () => {
		const onLight = layoutTextLayer(layer({ scrim: true, color: '#ffffff' }), FRAME, FONTS)
		expect(onLight.scrim?.color).toBe('rgba(0, 0, 0, 0.45)')

		const onDark = layoutTextLayer(layer({ scrim: true, color: '#111111' }), FRAME, FONTS)
		expect(onDark.scrim?.color).toBe('rgba(255, 255, 255, 0.65)')
	})

	it('treats an unparseable colour as light text (dark scrim)', () => {
		const t = layoutTextLayer(layer({ scrim: true, color: '#fff' }), FRAME, FONTS)
		expect(t.scrim?.color).toBe('rgba(0, 0, 0, 0.45)')
	})

	it('sizes the scrim to the wrapped lines', () => {
		// Forces two lines (see wrapping test below), so the panel must cover both.
		const t = layoutTextLayer(
			layer({ scrim: true, text: 'one two three four five six', width: 0.3 }),
			FRAME,
			FONTS
		)
		expect(t.lines.length).toBeGreaterThan(1)
		expect(t.scrim?.height).toBe(t.lines.length * t.lineHeight + t.fontSize * 0.3)
	})

	describe('wrapping', () => {
		it('keeps short text on one line', () => {
			const t = layoutTextLayer(layer({ text: 'Short' }), FRAME, FONTS)
			expect(t.lines).toEqual(['Short'])
		})

		it('wraps greedily when text exceeds the box width', () => {
			// box 300px / (40px * 0.5) = 15 chars per line
			const t = layoutTextLayer(
				layer({ text: 'one two three four five six', width: 0.3 }),
				FRAME,
				FONTS
			)
			expect(t.lines).toEqual(['one two three', 'four five six'])
		})

		it('preserves explicit line breaks, including blank lines', () => {
			const t = layoutTextLayer(layer({ text: 'first\n\nsecond' }), FRAME, FONTS)
			expect(t.lines).toEqual(['first', '', 'second'])
		})

		it('keeps an overlong single word on its own line rather than dropping it', () => {
			const t = layoutTextLayer(
				layer({ text: 'tiny Supercalifragilistic tiny', width: 0.1 }),
				FRAME,
				FONTS
			)
			expect(t.lines).toContain('Supercalifragilistic')
			expect(t.lines.join(' ').split(/\s+/)).toEqual(['tiny', 'Supercalifragilistic', 'tiny'])
		})
	})
})
