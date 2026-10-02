// Two editors in one page, DOM (the oracle) and the engine on a browser canvas, so differences
// can't come from the font backend the node-side golden harness uses.
import {
	Editor,
	TLRecord,
	TLRichText,
	TLShape,
	TLTextMeasurer,
	createTLStore,
	loadSnapshot,
} from '../../../editor/src'
import {
	createTldrawTextMeasurer,
	defaultAddFontsFromNode,
	defaultBindingUtils,
	defaultShapeUtils,
	renderHtmlFromRichTextWithExtensions,
	tipTapDefaultExtensions,
} from '../../../tldraw/src'
import { supportsRichText } from '../../../tldraw/src/lib/utils/text/DefaultTextMeasurer'
import { createCanvasMeasureContext, installMeasureContext } from '../../src'

declare global {
	interface Window {
		__rtl: typeof api
	}
}

export type Engine = 'dom' | 'native'

function makeEditor(textMeasurer: TLTextMeasurer | 'dom', fontAssetUrls: Record<string, string>) {
	const elm = document.createElement('div')
	elm.className = 'tl-container tl-theme__light'
	elm.style.cssText = 'position:absolute;inset:0;width:1080px;height:720px'
	document.body.appendChild(elm)
	const store = createTLStore({ shapeUtils: defaultShapeUtils, bindingUtils: defaultBindingUtils })
	return new Editor({
		store,
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: [],
		getContainer: () => elm,
		textMeasurer,
		fontAssetUrls,
		options: {
			text: {
				addFontsFromNode: defaultAddFontsFromNode,
				tipTapConfig: { extensions: tipTapDefaultExtensions },
			},
		},
	})
}

let editors: Record<Engine, Editor> | null = null

async function init(fontAssetUrls: Record<string, string>) {
	const ctx = document.createElement('canvas').getContext('2d')!
	const measureContext = createCanvasMeasureContext(ctx)
	await installMeasureContext(measureContext)
	// No DOM fallback: `routing` reports what the default measurer would do instead.
	const native = createTldrawTextMeasurer({ measureContext })
	editors = { dom: makeEditor('dom', fontAssetUrls), native: makeEditor(native, fontAssetUrls) }
}

function getEditors() {
	if (!editors) throw new Error('call init first')
	return editors
}

function plainText(richText: TLRichText | undefined): string {
	let out = ''
	const walk = (n: any) => {
		if (n?.text) out += n.text
		n?.content?.forEach(walk)
	}
	walk(richText)
	return out
}

function routing(richText: TLRichText | undefined): 'native' | 'dom' {
	return richText && supportsRichText(richText as any) ? 'native' : 'dom'
}

export interface ShapeMeasurement {
	w: number
	h: number
	/** Persisted values a create or text edit would write with this engine. */
	growY?: number
	fontSizeAdjustment?: number
	labelW?: number
	labelH?: number
}

function measureShape(editor: Editor, shape: TLShape): ShapeMeasurement {
	const geometry = editor.getShapeGeometry(shape)
	const out: ShapeMeasurement = { w: geometry.bounds.w, h: geometry.bounds.h }
	const util = editor.getShapeUtil(shape) as any
	if (shape.type === 'geo' || shape.type === 'note') {
		const next = (util.onBeforeCreate?.(shape) ?? shape) as any
		out.growY = next.props.growY
		if (shape.type === 'note') out.fontSizeAdjustment = next.props.fontSizeAdjustment
		// Geo and note bounds come from stored props, and their label geometry is clamped to the
		// shape, so a label that breaks differently only shows in the unclamped measurement.
		const label = shape.type === 'geo' ? util.getUnscaledLabelSize(shape) : util.getLabelSize(shape)
		out.labelW = label.w ?? label.labelWidth
		out.labelH = label.h ?? label.labelHeight
	}
	if (shape.type === 'arrow') {
		const label = (geometry as any).children?.find((c: any) => c.isLabel)
		if (label) {
			const scale = (shape.props as any).scale ?? 1
			out.labelW = label.bounds.w / scale
			out.labelH = label.bounds.h / scale
		}
	}
	return out
}

export interface BoardShapeResult {
	id: string
	type: string
	font: string
	size: string
	autoSize?: boolean
	scale: number
	routing: 'native' | 'dom'
	chars: number
	dom: ShapeMeasurement
	native: ShapeMeasurement
}

function loadBoard(editor: Editor, snapshot: any) {
	const records: Record<string, TLRecord> = {}
	for (const { state } of snapshot.documents) records[state.id] = state
	loadSnapshot(editor.store, { store: records as any, schema: snapshot.schema })
}

function measureBoard(snapshot: any): { results: BoardShapeResult[]; error?: string } {
	const { dom, native } = getEditors()
	try {
		loadBoard(dom, snapshot)
		loadBoard(native, snapshot)
	} catch (e) {
		return { results: [], error: String(e) }
	}
	const results: BoardShapeResult[] = []
	for (const shape of allShapes(dom)) {
		const props = shape.props as any
		if (!props.richText || !plainText(props.richText)) continue
		const other = native.getShape(shape.id)
		if (!other) continue
		results.push({
			id: shape.id,
			type: shape.type,
			font: props.font,
			size: props.size,
			autoSize: props.autoSize,
			scale: props.scale ?? 1,
			routing: routing(props.richText),
			chars: plainText(props.richText).length,
			dom: measureShape(dom, shape),
			native: measureShape(native, other),
		})
	}
	return { results }
}

function allShapes(editor: Editor): TLShape[] {
	return editor.store.allRecords().filter((r): r is TLShape => r.typeName === 'shape')
}

export interface FuzzCase {
	doc: TLRichText
	font: 'draw' | 'sans' | 'serif' | 'mono'
	fontSize: number
	/** null: max-content. number: wrap width. 'boundary': DOM max-content width plus `delta`. */
	width: number | null | 'boundary'
	delta?: number
	/**
	 * 'note' measures the way NoteShapeUtil's shrink loop does: no overflow-wrap breaking, with
	 * scrollWidth, which decides whether the note's font shrinks.
	 */
	mode?: 'text' | 'note'
}

export interface FuzzResult {
	maxWidth: number | null
	routing: 'native' | 'dom'
	dom: { w: number; h: number; scrollWidth: number }
	native: { w: number; h: number; scrollWidth: number }
}

const FONT_VARS = {
	draw: 'var(--tl-font-draw)',
	sans: 'var(--tl-font-sans)',
	serif: 'var(--tl-font-serif)',
	mono: 'var(--tl-font-mono)',
}

function measureCase(c: FuzzCase): FuzzResult {
	const { dom, native } = getEditors()
	const request = {
		richText: c.doc,
		html: () =>
			`<div class="tl-rich-text">${renderHtmlFromRichTextWithExtensions(c.doc, tipTapDefaultExtensions)}</div>`,
	}
	const opts = (maxWidth: number | null) => ({
		fontStyle: 'normal',
		fontWeight: 'normal',
		fontFamily: FONT_VARS[c.font],
		fontSize: c.fontSize,
		lineHeight: 1.35,
		padding: '0px',
		maxWidth,
		disableOverflowWrapBreaking: c.mode === 'note',
		measureScrollWidth: true,
	})
	let maxWidth: number | null = typeof c.width === 'number' ? c.width : null
	if (c.width === 'boundary') {
		const full = dom.textMeasure.measureRichText(request, opts(null))
		maxWidth = Math.max(1, full.w + (c.delta ?? 0))
	}
	const d = dom.textMeasure.measureRichText(request, opts(maxWidth))
	const n = native.textMeasure.measureRichText(request, opts(maxWidth))
	return {
		maxWidth,
		routing: routing(c.doc),
		dom: { w: d.w, h: d.h, scrollWidth: d.scrollWidth },
		native: { w: n.w, h: n.h, scrollWidth: n.scrollWidth },
	}
}

const api = {
	init,
	measureBoard,
	measureCases: (cases: FuzzCase[]) => cases.map(measureCase),
}

window.__rtl = api
