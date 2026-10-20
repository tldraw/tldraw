import {
	createTLStore,
	defaultAddFontsFromNode,
	defaultBindingUtils,
	defaultShapeTools,
	defaultShapeUtils,
	defaultTools,
	Editor,
	tipTapDefaultExtensions,
} from 'tldraw'
import { MermaidClassShapeUtil } from '../classShape'
import { MermaidEndLabelBindingUtil } from '../endLabelBinding'

/** A real editor, with the mermaid shape and binding utils unless `withMermaidUtils` is false. */
export function createEditor({ withMermaidUtils = true } = {}) {
	const shapeUtils = withMermaidUtils
		? [...defaultShapeUtils, MermaidClassShapeUtil]
		: defaultShapeUtils
	const bindingUtils = withMermaidUtils
		? [...defaultBindingUtils, MermaidEndLabelBindingUtil]
		: defaultBindingUtils
	const container = document.createElement('div')
	document.body.appendChild(container)
	const editor = new Editor({
		shapeUtils,
		bindingUtils,
		tools: [...defaultTools, ...defaultShapeTools],
		store: createTLStore({ shapeUtils, bindingUtils }),
		getContainer: () => container,
		initialState: 'select',
		options: {
			text: {
				addFontsFromNode: defaultAddFontsFromNode,
				tipTapConfig: { extensions: tipTapDefaultExtensions },
			},
		},
	})
	// jsdom lays out no text.
	editor.textMeasure.measureText = (text, opts) => {
		const w = text.length * (opts.fontSize / 2)
		return { x: 0, y: 0, w, h: opts.fontSize, scrollWidth: w }
	}
	editor.textMeasure.measureHtml = (html, opts) =>
		editor.textMeasure.measureText(html.replace(/<[^>]+>/g, ''), opts)
	return editor
}
