import {
	defaultAddFontsFromNode,
	defaultBindingUtils,
	defaultShapeTools,
	defaultShapeUtils,
	defaultTools,
	Editor,
	TLAnyShapeUtilConstructor,
	createTLStore,
	tipTapDefaultExtensions,
} from 'tldraw'

/**
 * A minimal headless editor for unit tests. Mirrors the essentials of the SDK's own
 * `TestEditor` — a sized container and a deterministic text-measurer (jsdom can't
 * measure text) — without pulling in its internal-only dependencies. Pass extra shape
 * utils to register custom shapes (e.g. the marketing-asset shape).
 */
export function makeEditor(extraShapeUtils: TLAnyShapeUtilConstructor[] = []): Editor {
	const shapeUtils = [...defaultShapeUtils, ...extraShapeUtils]
	const elm = document.createElement('div')
	const bounds = { x: 0, y: 0, top: 0, left: 0, width: 1080, height: 720, bottom: 720, right: 1080 }
	elm.getBoundingClientRect = () => bounds as DOMRect
	document.body.appendChild(elm)

	const editor = new Editor({
		shapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: [...defaultTools, ...defaultShapeTools],
		store: createTLStore({ shapeUtils, bindingUtils: defaultBindingUtils }),
		getContainer: () => elm,
		initialState: 'select',
		options: {
			text: {
				addFontsFromNode: defaultAddFontsFromNode,
				tipTapConfig: { extensions: tipTapDefaultExtensions },
			},
		},
	})

	// jsdom returns 0 for every text dimension, which collapses text-shape bounds and
	// arrow geometry. Give characters a fixed size so bounds are deterministic.
	editor.textMeasure.measureText = ((text: string) => {
		const lines = text.split('\n')
		const w = Math.max(1, ...lines.map((l) => l.length * 8))
		return { x: 0, y: 0, w, h: lines.length * 20, scrollWidth: w }
	}) as never

	return editor
}
