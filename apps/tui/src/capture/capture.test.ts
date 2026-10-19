import { createShapeId, type Editor } from '@tldraw/editor'
import { toRichText } from '@tldraw/tlschema'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTuiEditor, type TuiEditor } from '../editor/createTuiEditor'
import { CELL_TEXT_METRICS, FONT_TEXT_METRICS } from '../editor/textMeasure'
import { createRenderToText } from '../render/renderToText'
import { getGlyphs } from '../terminal/chars'
import { capture, formatFromPath } from './capture'

const renderToText = createRenderToText({
	glyphs: getGlyphs('rich'),
	colorMode: 'light',
	stroke: 'braille',
})

function pngSize(data: Uint8Array) {
	const view = new DataView(data.buffer, data.byteOffset)
	return { w: view.getUint32(16), h: view.getUint32(20) }
}

function addShapes(editor: Editor) {
	editor.createShapes([
		{
			id: createShapeId('a'),
			type: 'geo',
			x: 0,
			y: 0,
			props: { w: 200, h: 100, richText: toRichText('Hello') },
		},
		{ id: createShapeId('far'), type: 'geo', x: 5000, y: 0, props: { w: 100, h: 100 } },
	])
}

describe('capture', () => {
	let tui: TuiEditor
	beforeEach(() => {
		tui = createTuiEditor({ colorMode: 'light', cols: 60, rows: 20 })
		addShapes(tui.editor)
		tui.editor.setCamera({ x: 20, y: 20, z: 1 }, { immediate: true })
	})
	afterEach(() => tui.dispose())

	it('picks the format from the file extension', () => {
		expect(formatFromPath('a.PNG')).toBe('png')
		expect(formatFromPath('a.svg')).toBe('svg')
		expect(formatFromPath('a.txt')).toBe('text')
		expect(formatFromPath('a')).toBe('text')
	})

	it('captures the viewport as text at the viewport size', async () => {
		const result = await capture(tui.editor, { scope: 'viewport', format: 'text', renderToText })
		expect(result.ok).toBe(true)
		const lines = (result as { data: string }).data.split('\n')
		expect(lines.length).toBeLessThanOrEqual(20)
		expect(lines.some((l) => l.includes('Hello'))).toBe(true)
		expect(lines[1]).toBe('  ┌────────────────────────┐')
	})

	it('captures the document as text, including off-screen shapes', async () => {
		const result = await capture(tui.editor, { scope: 'document', format: 'text', renderToText })
		const text = (result as { data: string }).data
		expect(text).toContain('Hello')
		expect(Math.max(...text.split('\n').map((l) => l.length))).toBeGreaterThan(600)
	})

	it('reports an empty selection', async () => {
		const result = await capture(tui.editor, { scope: 'selection', format: 'text', renderToText })
		expect(result).toEqual({ ok: false, error: 'Nothing is selected' })
	})

	it('exports SVG with labels as SVG text and a background', async () => {
		tui.editor.select(createShapeId('a'))
		const result = await capture(tui.editor, { scope: 'selection', format: 'svg', renderToText })
		const svg = (result as { data: string }).data
		expect(svg).not.toContain('foreignObject')
		expect(svg).toMatch(/<text[^>]*>Hello<\/text>/)
		expect(svg).toMatch(/<rect[^>]*fill="#f9fafb"/)
		expect(svg).toMatch(/<text[^>]*paint-order="stroke"[^>]*>Hello<\/text>/)
	})

	it('renders the viewport as a PNG of the viewport size times the scale', async () => {
		const result = await capture(tui.editor, {
			scope: 'viewport',
			format: 'png',
			renderToText,
			scale: 2,
		})
		expect(result.ok).toBe(true)
		const data = (result as { data: Uint8Array }).data
		expect([...data.slice(1, 4)]).toEqual([0x50, 0x4e, 0x47])
		expect(pngSize(data)).toEqual({ w: 60 * 8 * 2, h: 20 * 16 * 2 })
	})

	it('leaves only shapes inside the viewport in a viewport image', async () => {
		const result = await capture(tui.editor, { scope: 'viewport', format: 'svg', renderToText })
		const svg = (result as { data: string }).data
		expect(svg.match(/<g transform/g)?.length).toBe(1)
	})
})

describe('label outlines', () => {
	it('outlines only labels tldraw outlines', async () => {
		const tui = createTuiEditor({ colorMode: 'light' })
		tui.editor.createShape({ type: 'note', props: { richText: toRichText('Note') } })
		const result = await capture(tui.editor, { scope: 'document', format: 'svg', renderToText })
		const svg = (result as { data: string }).data
		expect(svg).toMatch(/<text[^>]*>Note<\/text>/)
		expect(svg).not.toMatch(/<text[^>]*stroke=[^>]*>Note<\/text>/)
		tui.dispose()
	})
})

describe('capture with font metrics', () => {
	it('wraps labels at real font widths', async () => {
		const tui = createTuiEditor({ colorMode: 'light', textMetrics: FONT_TEXT_METRICS })
		tui.editor.createShape({
			type: 'geo',
			props: { w: 200, h: 200, richText: toRichText('one two three four five six') },
		})
		const result = await capture(tui.editor, {
			scope: 'document',
			format: 'svg',
			renderToText,
			metrics: FONT_TEXT_METRICS,
		})
		const svg = (result as { data: string }).data
		// 200 px minus 2 × 16 px padding fits 12 characters of a 22 px monospace font.
		expect(svg.match(/<text/g)?.length).toBe(3)
		expect(CELL_TEXT_METRICS.charWidth(22)).toBe(8)
		tui.dispose()
	})
})
