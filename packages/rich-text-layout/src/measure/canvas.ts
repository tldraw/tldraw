import { FontMetrics, FontSpec, MeasureContext, fontSpecToString } from './types'

/**
 * The subset of a canvas 2D context the engine needs. Declared here so the core compiles without
 * DOM lib types; a browser `CanvasRenderingContext2D`, an `OffscreenCanvasRenderingContext2D`,
 * and `@napi-rs/canvas`'s context all satisfy it.
 *
 * @public
 */
export interface CanvasTextContextLike {
	font: string
	measureText(text: string): {
		width: number
		fontBoundingBoxAscent?: number
		fontBoundingBoxDescent?: number
		actualBoundingBoxAscent?: number
		actualBoundingBoxDescent?: number
	}
}

const ZERO_WIDTH = /[\u200B\u2060\uFEFF]/
const ZERO_WIDTH_ALL = /[\u200B\u2060\uFEFF]/g

interface FontState {
	/** The value assigned to `ctx.font`, fallback families included. */
	font: string
	widths: Map<string, number>
	metrics: FontMetrics | null
}

/** @public */
export interface CanvasMeasureContextOptions {
	/**
	 * Families appended to every font for glyphs the declared families lack (CJK, emoji,
	 * Arabic...). Browsers fall back to system fonts on their own; a canvas backend in a container
	 * has none, so register fallback faces and name them here.
	 */
	fallbackFamilies?: readonly string[]
}

/**
 * A `MeasureContext` backed by any canvas-2D-like context. Font metrics come from
 * `fontBoundingBoxAscent/Descent` where the implementation provides them.
 *
 * @public
 */
export function createCanvasMeasureContext(
	ctx: CanvasTextContextLike,
	options: CanvasMeasureContextOptions = {}
): MeasureContext {
	const fallback = (options.fallbackFamilies ?? [])
		.map((family) => (family.includes(' ') ? `"${family}"` : family))
		.join(', ')
	const states = new Map<string, FontState>()
	const statesBySpec = new WeakMap<FontSpec, FontState>()
	let currentFont = ''

	function stateFor(font: FontSpec): FontState {
		let state = statesBySpec.get(font)
		if (state) return state
		const str = fontSpecToString(font)
		state = states.get(str)
		if (!state) {
			// Fallback families go after the declared ones so skia can pick glyphs from them
			// without changing which font draws the characters the primary font covers.
			state = { font: fallback ? `${str}, ${fallback}` : str, widths: new Map(), metrics: null }
			states.set(str, state)
		}
		statesBySpec.set(font, state)
		return state
	}

	// Assigning `font` makes the browser parse the shorthand, so cache hits never touch it.
	function measureText(state: FontState, text: string) {
		if (state.font !== currentFont) {
			ctx.font = state.font
			currentFont = state.font
		}
		return ctx.measureText(text)
	}

	return {
		measure(text, font) {
			const state = stateFor(font)
			let width = state.widths.get(text)
			if (width === undefined) {
				// Browsers give zero-width spaces and word joiners no advance even when the font
				// has no glyph for them; skia measures the font's .notdef box instead.
				const measurable = ZERO_WIDTH.test(text) ? text.replace(ZERO_WIDTH_ALL, '') : text
				width = measurable.length === 0 ? 0 : measureText(state, measurable).width
				state.widths.set(text, width)
			}
			return { width }
		},
		metrics(font) {
			const state = stateFor(font)
			if (!state.metrics) {
				const m = measureText(state, 'Hg')
				// Fall back to typical Latin proportions when the implementation lacks font
				// bounding box support (older browsers).
				const ascent = m.fontBoundingBoxAscent ?? font.size * 0.9
				const descent = m.fontBoundingBoxDescent ?? font.size * 0.25
				state.metrics = { ascent, descent, zeroAdvance: measureText(state, '0').width }
			}
			return state.metrics
		},
	}
}
