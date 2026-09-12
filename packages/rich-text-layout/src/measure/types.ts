/**
 * A font to measure with. `weight` and `style` use CSS keywords or numbers (`'normal'`, `'bold'`,
 * `'600'`, `'italic'`). `family` is a CSS family list.
 *
 * @public
 */
export interface FontSpec {
	family: string
	size: number
	weight: string
	style: string
}

/**
 * Vertical metrics of a font at a given size, in pixels. `ascent` and `descent` are the font's
 * line metrics (what a browser uses for the inline box), not ink bounds.
 *
 * @public
 */
export interface FontMetrics {
	ascent: number
	descent: number
	/** Advance width of the digit zero; the `ch` unit. */
	zeroAdvance: number
}

/**
 * The measurement backend. The layout engine never touches a canvas or the DOM directly: every
 * advance and metric comes from here, so a backend can be canvas, a font-table ruler, or a fake
 * in tests.
 *
 * @public
 */
export interface MeasureContext {
	measure(text: string, font: FontSpec): { width: number }
	metrics(font: FontSpec): FontMetrics
}

const fontStringCache = new WeakMap<FontSpec, string>()
const fontSpecsByString = new Map<string, FontSpec>()

/**
 * The CSS font shorthand for a spec. The string is what pretext keys its caches on and what the
 * canvas shim receives back, so it is kept stable and registered for reverse lookup.
 *
 * @public
 */
export function fontSpecToString(font: FontSpec): string {
	let cached = fontStringCache.get(font)
	if (cached) return cached
	const style = font.style === 'normal' ? '' : `${font.style} `
	const weight = font.weight === 'normal' ? '' : `${font.weight} `
	cached = `${style}${weight}${font.size}px ${font.family}`
	fontStringCache.set(font, cached)
	if (!fontSpecsByString.has(cached)) fontSpecsByString.set(cached, { ...font })
	return cached
}

const STYLE_KEYWORDS = new Set(['normal', 'italic', 'oblique'])
const WEIGHT_KEYWORDS = new Set(['normal', 'bold', 'bolder', 'lighter'])

/**
 * Parse a CSS font shorthand back into a spec. Strings produced by `fontSpecToString` are looked
 * up directly; anything else goes through a small parser that understands
 * `[style] [weight] size family`.
 *
 * @public
 */
export function parseFontString(font: string): FontSpec {
	const known = fontSpecsByString.get(font)
	if (known) return known

	let style = 'normal'
	let weight = 'normal'
	let size = 16
	let family = 'sans-serif'
	// The size is the token with the px unit; everything before it is style/weight (a bare
	// number there is a weight, not a size), everything after it the family list.
	const tokens = font.trim().split(/\s+/)
	let sizeIndex = tokens.findIndex((token) => /^\d*\.?\d+px(\/.*)?$/.test(token))
	if (sizeIndex === -1) sizeIndex = tokens.findIndex((token) => /^\d*\.?\d+$/.test(token))
	if (sizeIndex === -1) sizeIndex = tokens.length
	for (const token of tokens.slice(0, sizeIndex)) {
		if (STYLE_KEYWORDS.has(token)) style = token
		else if (WEIGHT_KEYWORDS.has(token) || /^\d{3}$/.test(token)) weight = token
	}
	if (sizeIndex < tokens.length) {
		size = parseFloat(tokens[sizeIndex])
		if (sizeIndex + 1 < tokens.length) family = tokens.slice(sizeIndex + 1).join(' ')
	}
	const spec = { family, size, weight, style }
	fontSpecsByString.set(font, spec)
	return spec
}
