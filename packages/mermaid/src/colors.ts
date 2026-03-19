import { defaultColorNames, DefaultColorThemePalette } from '@tldraw/tlschema'
import { TLDefaultColorStyle, TLDefaultDashStyle, TLDefaultSizeStyle } from 'tldraw'

type Color = [number, number, number, number]

export interface ParsedNodeColors {
	fillColor?: TLDefaultColorStyle
	strokeColor?: TLDefaultColorStyle
}

/**
 * Build a map of node id → parsed fill/stroke colors from Mermaid's classDef definitions.
 *
 * Uses the structured data from `db.getClasses()` and each node's `classes`
 * array. For each node, looks up its applied classDef styles and maps fill and
 * stroke independently to the nearest tldraw palette color.
 */
export function buildClassDefColorMap(
	classDefs: Map<string, { styles: string[] }>,
	items: Iterable<[string, { classes?: string[] }]>
): Map<string, ParsedNodeColors> {
	const result = new Map<string, ParsedNodeColors>()
	if (classDefs.size === 0) return result

	for (const [nodeId, item] of items) {
		if (!item.classes || item.classes.length === 0) continue

		for (const className of item.classes) {
			const classDef = classDefs.get(className)
			if (!classDef || classDef.styles.length === 0) continue

			const props = parseCssProps(classDef.styles)
			const fill = toColor(props.get('fill'))
			const stroke = toColor(props.get('stroke'))

			if (!fill && !stroke) continue

			const colors: ParsedNodeColors = {}
			if (fill) colors.fillColor = nearestTldrawColor(fill)
			if (stroke) colors.strokeColor = nearestTldrawColor(stroke)
			result.set(nodeId, colors)
			break
		}
	}

	return result
}

export function parseRgbToTldrawColor(
	text: string
): { color: TLDefaultColorStyle; hasAlpha: boolean } | null {
	const color = toColor(text)
	if (!color) return null
	return { color: nearestTldrawColor(color), hasAlpha: color[3] < 255 }
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

	const stroke = toColor(props.get('stroke'))
	if (stroke) {
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
 * array and return fill and stroke as independent tldraw colors.
 */
export function parseNodeInlineColor(styles: string[] | undefined): ParsedNodeColors | undefined {
	if (!styles || styles.length === 0) return undefined

	const props = parseCssProps(styles)
	const fill = toColor(props.get('fill'))
	const stroke = toColor(props.get('stroke'))

	if (!fill && !stroke) return undefined

	const colors: ParsedNodeColors = {}
	if (fill) colors.fillColor = nearestTldrawColor(fill)
	if (stroke) colors.strokeColor = nearestTldrawColor(stroke)
	return colors
}

/**
 * Extract fill colors from rendered SVG node groups by reading the fill attribute
 * from the first shape element in each group.
 */
export function parseSvgFillColors(
	root: Element,
	selector: string,
	idParser: (domId: string) => string
): Map<string, TLDefaultColorStyle> {
	const result = new Map<string, TLDefaultColorStyle>()
	for (const groupEl of root.querySelectorAll(selector)) {
		const rawId = groupEl.getAttribute('id') || ''
		const id = idParser(rawId)

		const shape =
			groupEl.querySelector('rect, circle, ellipse, polygon, path') ??
			groupEl.querySelector('.label-container')
		if (shape) {
			const fill = shape.getAttribute('fill')
			if (fill) {
				const parsed = parseRgbToTldrawColor(fill)
				if (parsed) result.set(id, parsed.color)
			}
		}
	}
	return result
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

/** Map an arbitrary Color tuple to the nearest tldraw named color (best-effort). */
function nearestTldrawColor(rgb: Color): TLDefaultColorStyle {
	let [r, g, b] = rgb

	const max = Math.max(r, g, b)
	const min = Math.min(r, g, b)
	const lightness = (max + min) / 2 / 255
	const chroma = max - min

	// For very light pastels, strip the white base and amplify the
	// chromatic signal so the distance metric can see the hue.
	if (lightness > 0.75 && chroma > 5) {
		const target = 200
		r = Math.round(((r - min) / chroma) * target)
		g = Math.round(((g - min) / chroma) * target)
		b = Math.round(((b - min) / chroma) * target)
	}

	let best: TLDefaultColorStyle = 'black'
	let bestDistance = Infinity
	for (const [name, red, green, blue] of TLDRAW_PALETTE) {
		// "Redmean" weighted Euclidean distance (Compuphase approximation).
		// Weights RGB channels by the average red value of the two colors to
		// approximate human perception, which is more sensitive to green and
		// varies in red/blue sensitivity depending on the color's warmth.
		const rMean = (r + red) / 2
		const dR = r - red
		const dG = g - green
		const dB = b - blue
		const distance = (2 + rMean / 256) * dR * dR + 4 * dG * dG + (2 + (255 - rMean) / 256) * dB * dB
		if (distance < bestDistance) {
			bestDistance = distance
			best = name
		}
	}
	return best
}

function toColor(value: string | undefined): Color | undefined {
	if (!value) return undefined

	const trimmed = value.trim()
	if (!trimmed || trimmed === 'none' || trimmed === 'transparent') return undefined

	if (trimmed.startsWith('rgb')) {
		const match = trimmed.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/)
		if (!match) return undefined
		return [
			parseInt(match[1], 10),
			parseInt(match[2], 10),
			parseInt(match[3], 10),
			match[4] !== undefined ? Math.round(parseFloat(match[4]) * 255) : 255,
		]
	}
	if (trimmed.startsWith('#')) {
		const rgb = parseHexToRgb(trimmed)
		if (!rgb) return undefined
		return [rgb[0], rgb[1], rgb[2], 255]
	}
	return undefined
}
