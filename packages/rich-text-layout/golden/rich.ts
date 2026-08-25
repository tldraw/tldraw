// Rich text side of the golden harness: renders each case to HTML exactly as tldraw does
// (renderHtmlFromRichTextForMeasurement) for Chromium, and lays the same document out through
// createTldrawTextMeasurer for the engine. tldraw's TipTap HTML generation needs a DOM, so a
// jsdom window is installed before the tldraw modules load.
import { JSDOM } from 'jsdom'
import { getMeasureContext } from '../src/measure/install'
import { FAMILIES, LINE_HEIGHT, RichCase } from './corpus'
import { EngineResult } from './engine'

const dom = new JSDOM('<!doctype html><html><body></body></html>')
const g = globalThis as any
g.window = dom.window
g.document = dom.window.document
g.Node = dom.window.Node
g.DOMParser = dom.window.DOMParser
g.navigator ??= dom.window.navigator

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderHtmlFromRichTextWithExtensions, tipTapDefaultExtensions } =
	await import('../../tldraw/src/lib/utils/text/richText')
const { createTldrawTextMeasurer } =
	await import('../../tldraw/src/lib/utils/text/createTldrawTextMeasurer')

export function richCaseToHtml(c: RichCase) {
	const html = renderHtmlFromRichTextWithExtensions(c.doc, tipTapDefaultExtensions)
	return `<div class="tl-rich-text">${html}</div>`
}

let measurer: ReturnType<typeof createTldrawTextMeasurer> | null = null

export function layoutRichCase(c: RichCase, box?: { width: number }) {
	measurer ??= createTldrawTextMeasurer({
		measureContext: getMeasureContext(),
		colors: { link: '#3182ed', highlight: '#fddd00' },
	})
	return measurer.layoutRichText(c.doc, {
		fontFamily: FAMILIES[c.family],
		fontSize: c.fontSize,
		fontWeight: 'normal',
		fontStyle: 'normal',
		lineHeight: LINE_HEIGHT,
		padding: '0px',
		maxWidth: box?.width ?? c.maxWidth,
		minWidth: box?.width,
		textAlign: c.textAlign,
	})
}

export function measureRichInEngine(c: RichCase): EngineResult {
	const layout = layoutRichCase(c)
	return {
		id: c.id,
		w: layout.width,
		h: layout.height,
		lines: layout.lines.length,
		lineTops: layout.lines.map((l) => l.y),
	}
}
