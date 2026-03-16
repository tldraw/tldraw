import { defaultColorNames, DefaultColorThemePalette } from '@tldraw/tlschema'
import { TLDefaultColorStyle, TLDefaultDashStyle, TLDefaultSizeStyle } from 'tldraw'

/**
 * Build a map of node id → tldraw color from Mermaid's classDef definitions.
 *
 * Uses the structured data from `db.getClasses()` and each node's `classes`
 * array instead of parsing the SVG's `<style>` block with regex. For each
 * node, looks up its applied classDef styles (fill/stroke hex colors) and
 * blends them into the nearest tldraw palette color.
 *
 * @param classDefs - The classDef map from `db.getClasses()`, keyed by class name.
 *   Each entry must have a `styles` array of CSS declarations (e.g. `["fill:#f96", "stroke:#333"]`).
 * @param items - An iterable of `[nodeId, item]` entries where each item may have
 *   a `classes` string array listing applied classDef names.
 * @returns A map from node id to the nearest tldraw color derived from the classDef.
 */
export function buildClassDefColorMap(
	classDefs: Map<string, { styles: string[] }>,
	items: Iterable<[string, { classes?: string[] }]>
): Map<string, TLDefaultColorStyle> {
	const result = new Map<string, TLDefaultColorStyle>()
	if (classDefs.size === 0) return result

	for (const [nodeId, item] of items) {
		if (!item.classes || item.classes.length === 0) continue

		// Try each applied class in order; first match wins.
		for (const className of item.classes) {
			const classDef = classDefs.get(className)
			if (!classDef || classDef.styles.length === 0) continue

			const props = parseCssProps(classDef.styles)
			const fillHex = stripHash(props.get('fill'))
			const strokeHex = stripHash(props.get('stroke'))
			if (!fillHex && !strokeHex) continue

			const color = classDefToTldrawColor(fillHex, strokeHex)
			if (color) {
				result.set(nodeId, color)
				break
			}
		}
	}

	return result
}

export function parseRgbToTldrawColor(
	text: string
): { color: TLDefaultColorStyle; hasAlpha: boolean } | null {
	// Matches `rgb(r, g, b)` or `rgba(r, g, b, a)` color strings.
	// Groups 1-3 = red/green/blue integers, group 4 = optional alpha float.
	const match = text.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/)
	if (!match) return null
	const r = parseInt(match[1], 10)
	const g = parseInt(match[2], 10)
	const b = parseInt(match[3], 10)
	const a = match[4] !== undefined ? parseFloat(match[4]) : 1
	const hex = `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
	return { color: nearestTldrawColor(hex), hasAlpha: a < 1 }
}

interface ParsedCssOverrides {
	color?: TLDefaultColorStyle
	dashOverride?: TLDefaultDashStyle
	sizeOverride?: TLDefaultSizeStyle
}

function parseCssProps(styles: string[]): Map<string, string> {
	const props = new Map<string, string>()
	for (const entry of styles) {
		for (const part of entry.split(';')) {
			const colon = part.indexOf(':')
			if (colon < 0) continue
			const key = part.slice(0, colon).trim().toLowerCase()
			const value = part.slice(colon + 1).trim()
			if (key && value) props.set(key, value)
		}
	}
	return props
}

/**
 * Parse a Mermaid CSS style array from an edge (FlowEdge.style / linkStyle)
 * and return tldraw-compatible overrides.
 */
export function parseCssStyles(styles: string[] | undefined): ParsedCssOverrides {
	if (!styles || styles.length === 0) return {}

	const props = parseCssProps(styles)
	const result: ParsedCssOverrides = {}

	const stroke = props.get('stroke')
	if (stroke && stroke.startsWith('#')) {
		result.color = nearestTldrawColor(stroke)
	}

	if (props.has('stroke-dasharray')) {
		result.dashOverride = 'dashed'
	}

	const strokeWidth = props.get('stroke-width')
	if (strokeWidth) {
		const pixels = parseFloat(strokeWidth)
		if (Number.isFinite(pixels)) {
			if (pixels <= 1) result.sizeOverride = 's'
			else if (pixels <= 2) result.sizeOverride = 'm'
			else result.sizeOverride = 'l'
		}
	}

	return result
}

/**
 * Parse inline `style nodeId fill:…,stroke:…` directives from a FlowVertex.styles
 * array and return a tldraw color using the same fill+stroke blending as classDefs.
 */
export function parseNodeInlineColor(
	styles: string[] | undefined
): TLDefaultColorStyle | undefined {
	if (!styles || styles.length === 0) return undefined

	const props = parseCssProps(styles)
	const fillHex = stripHash(props.get('fill'))
	const strokeHex = stripHash(props.get('stroke'))

	if (!fillHex && !strokeHex) return undefined
	return classDefToTldrawColor(fillHex, strokeHex)
}

/**
 * Mermaid classDefs typically pair a very light pastel fill with a more saturated
 * stroke of the same color family.  A weighted blend (30 % fill, 70 % stroke)
 * keeps us in the correct tldraw color family: the stroke carries most of the
 * hue intent while the fill nudges toward lighter variants (e.g. light-green
 * instead of green, yellow instead of orange for warm cream + amber combos).
 */
const FILL_WEIGHT = 0.3

function classDefToTldrawColor(
	fillHex: string | undefined,
	strokeHex: string | undefined
): TLDefaultColorStyle | undefined {
	const fillRgb = fillHex ? parseHexToRgb(fillHex) : null
	const strokeRgb = strokeHex ? parseHexToRgb(strokeHex) : null

	if (fillRgb && strokeRgb) {
		const strokeWeight = 1 - FILL_WEIGHT
		const blend = (channel: number) =>
			Math.round(fillRgb[channel] * FILL_WEIGHT + strokeRgb[channel] * strokeWeight)
		const blendHex =
			blend(0).toString(16).padStart(2, '0') +
			blend(1).toString(16).padStart(2, '0') +
			blend(2).toString(16).padStart(2, '0')
		return nearestTldrawColor(blendHex)
	}

	if (fillRgb) return nearestTldrawColor(fillHex!)
	if (strokeRgb) return nearestTldrawColor(strokeHex!)
	return undefined
}

function parseHexToRgb(hex: string): [number, number, number] | null {
	const stripped = hex.replace(/^#/, '')
	if (stripped.length === 3 || stripped.length === 4) {
		return [
			parseInt(stripped[0] + stripped[0], 16),
			parseInt(stripped[1] + stripped[1], 16),
			parseInt(stripped[2] + stripped[2], 16),
		]
	}
	if (stripped.length === 6 || stripped.length === 8) {
		return [
			parseInt(stripped.slice(0, 2), 16),
			parseInt(stripped.slice(2, 4), 16),
			parseInt(stripped.slice(4, 6), 16),
		]
	}
	return null
}

const TLDRAW_PALETTE: [TLDefaultColorStyle, number, number, number][] = defaultColorNames.map(
	(name) => {
		const { solid } = DefaultColorThemePalette.lightMode[name]
		const rgb = parseHexToRgb(solid)!
		return [name, rgb[0], rgb[1], rgb[2]]
	}
)

/** Map an arbitrary hex color to the nearest tldraw named color (best-effort). */
function nearestTldrawColor(hex: string): TLDefaultColorStyle {
	const rgb = parseHexToRgb(hex)
	if (!rgb) return 'black'

	let best: TLDefaultColorStyle = 'black'
	let bestDistance = Infinity
	for (const [name, red, green, blue] of TLDRAW_PALETTE) {
		// "Redmean" weighted Euclidean distance (Compuphase approximation).
		// Weights RGB channels by the average red value of the two colors to
		// approximate human perception, which is more sensitive to green and
		// varies in red/blue sensitivity depending on the color's warmth.
		const rMean = (rgb[0] + red) / 2
		const dR = rgb[0] - red
		const dG = rgb[1] - green
		const dB = rgb[2] - blue
		const distance = (2 + rMean / 256) * dR * dR + 4 * dG * dG + (2 + (255 - rMean) / 256) * dB * dB
		if (distance < bestDistance) {
			bestDistance = distance
			best = name
		}
	}
	return best
}

function stripHash(value: string | undefined): string | undefined {
	return value?.startsWith('#') ? value.slice(1) : value
}
