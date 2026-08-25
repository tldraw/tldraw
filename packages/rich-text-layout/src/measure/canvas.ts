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
	const metricsCache = new Map<string, FontMetrics>()
	const widthCache = new Map<string, Map<string, number>>()
	const fallback = (options.fallbackFamilies ?? [])
		.map((family) => (family.includes(' ') ? `"${family}"` : family))
		.join(', ')
	let currentFont = ''

	function setFont(font: FontSpec) {
		const str = fontSpecToString(font)
		if (str !== currentFont) {
			// Fallback families go after the declared ones so skia can pick glyphs from them
			// without changing which font draws the characters the primary font covers.
			ctx.font = fallback ? `${str}, ${fallback}` : str
			currentFont = str
		}
		return str
	}

	return {
		measure(text, font) {
			const str = setFont(font)
			let cache = widthCache.get(str)
			if (!cache) {
				cache = new Map()
				widthCache.set(str, cache)
			}
			let width = cache.get(text)
			if (width === undefined) {
				// Browsers give zero-width spaces and word joiners no advance even when the font
				// has no glyph for them; skia measures the font's .notdef box instead.
				const measurable = ZERO_WIDTH.test(text) ? text.replace(ZERO_WIDTH_ALL, '') : text
				width = measurable.length === 0 ? 0 : ctx.measureText(measurable).width
				cache.set(text, width)
			}
			return { width }
		},
		metrics(font) {
			const str = setFont(font)
			let metrics = metricsCache.get(str)
			if (!metrics) {
				const m = ctx.measureText('Hg')
				// Fall back to typical Latin proportions when the implementation lacks font
				// bounding box support (older browsers).
				const ascent = m.fontBoundingBoxAscent ?? font.size * 0.9
				const descent = m.fontBoundingBoxDescent ?? font.size * 0.25
				metrics = { ascent, descent, zeroAdvance: ctx.measureText('0').width }
				metricsCache.set(str, metrics)
			}
			return metrics
		},
	}
}
