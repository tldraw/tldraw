import {
	Box,
	createTLStore,
	defaultAddFontsFromNode,
	defaultBindingUtils,
	defaultShapeTools,
	defaultShapeUtils,
	defaultTools,
	Editor,
	tipTapDefaultExtensions,
	type TLMeasureTextOpts,
} from 'tldraw'

/** A headless editor whose text measurement is deterministic: 16 units per character and 32 per line at 24px, scaled by font size. */
export function createTestEditor(): Editor {
	const container = document.createElement('div')
	document.body.appendChild(container)
	const store = createTLStore({ shapeUtils: defaultShapeUtils, bindingUtils: defaultBindingUtils })
	const editor = new Editor({
		store,
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: [...defaultTools, ...defaultShapeTools],
		getContainer: () => container,
		textOptions: {
			addFontsFromNode: defaultAddFontsFromNode,
			tipTapConfig: { extensions: tipTapDefaultExtensions },
		},
	})
	editor.updateViewportScreenBounds(new Box(0, 0, 1280, 800))
	const measure = (text: string, opts: TLMeasureTextOpts) => {
		const scale = (opts.fontSize || 24) / 24
		const lines = text
			.replace(/<\/p>\s*<p[^>]*>/gi, '\n')
			.replace(/<br\s*\/?>/gi, '\n')
			.replace(/<[^>]+>/g, '')
			.split('\n')
		const longest = Math.max(1, ...lines.map((l) => l.length))
		const w = Math.min(longest * 16 * scale, opts.maxWidth ?? Infinity)
		return { w, h: lines.length * 32 * scale, x: 0, y: 0, scrollWidth: w }
	}
	editor.textMeasure.measureText = measure
	editor.textMeasure.measureHtml = measure
	editor.textMeasure.measureHtmlBatch = (requests) => requests.map((r) => measure(r.html, r.opts))
	return editor
}
