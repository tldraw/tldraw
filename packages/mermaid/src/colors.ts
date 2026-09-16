import { hasOwnProperty } from '@tldraw/utils'
import { DEFAULT_THEME, TLDefaultColorStyle, TLDefaultDashStyle, TLDefaultSizeStyle } from 'tldraw'
import type { MermaidBlueprintNode } from './blueprint'

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
		for (const className of item.classes ?? []) {
			const colors = parseNodeInlineColor(classDefs.get(className)?.styles)
			if (colors) {
				result.set(nodeId, colors)
				break
			}
		}
	}

	return result
}

/** Blueprint node style props for parsed fill/stroke colors: solid fill when a fill was set, stroke color preferred. */
export function toNodeColorProps(
	colors: ParsedNodeColors | undefined
): Pick<MermaidBlueprintNode, 'fill' | 'color'> {
	if (!colors) return {}
	return {
		...(colors.fillColor && { fill: 'solid' as const }),
		color: colors.strokeColor ?? colors.fillColor,
	}
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

const defaultColorNames: TLDefaultColorStyle[] = [
	'black',
	'grey',
	'light-violet',
	'violet',
	'blue',
	'light-blue',
	'yellow',
	'orange',
	'green',
	'light-green',
	'light-red',
	'red',
	'white',
]

const TLDRAW_PALETTE: [TLDefaultColorStyle, number, number, number][] = defaultColorNames.map(
	(name) => {
		const { solid } = DEFAULT_THEME.colors.light[name]!
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
	const keyword = trimmed.toLowerCase()
	if (hasOwnProperty(CSS_NAMED_COLORS, keyword)) {
		const rgb = parseHexToRgb(CSS_NAMED_COLORS[keyword])!
		return [rgb[0], rgb[1], rgb[2], 255]
	}
	return undefined
}

// Mermaid accepts CSS color keywords wherever it takes a color, and sequence `box` statements
// can't take a hex color at all, so without these a box's color is usually lost.
const CSS_NAMED_COLORS: Record<string, string> = {
	aliceblue: 'f0f8ff',
	antiquewhite: 'faebd7',
	aqua: '00ffff',
	aquamarine: '7fffd4',
	azure: 'f0ffff',
	beige: 'f5f5dc',
	bisque: 'ffe4c4',
	black: '000000',
	blanchedalmond: 'ffebcd',
	blue: '0000ff',
	blueviolet: '8a2be2',
	brown: 'a52a2a',
	burlywood: 'deb887',
	cadetblue: '5f9ea0',
	chartreuse: '7fff00',
	chocolate: 'd2691e',
	coral: 'ff7f50',
	cornflowerblue: '6495ed',
	cornsilk: 'fff8dc',
	crimson: 'dc143c',
	cyan: '00ffff',
	darkblue: '00008b',
	darkcyan: '008b8b',
	darkgoldenrod: 'b8860b',
	darkgray: 'a9a9a9',
	darkgreen: '006400',
	darkgrey: 'a9a9a9',
	darkkhaki: 'bdb76b',
	darkmagenta: '8b008b',
	darkolivegreen: '556b2f',
	darkorange: 'ff8c00',
	darkorchid: '9932cc',
	darkred: '8b0000',
	darksalmon: 'e9967a',
	darkseagreen: '8fbc8f',
	darkslateblue: '483d8b',
	darkslategray: '2f4f4f',
	darkslategrey: '2f4f4f',
	darkturquoise: '00ced1',
	darkviolet: '9400d3',
	deeppink: 'ff1493',
	deepskyblue: '00bfff',
	dimgray: '696969',
	dimgrey: '696969',
	dodgerblue: '1e90ff',
	firebrick: 'b22222',
	floralwhite: 'fffaf0',
	forestgreen: '228b22',
	fuchsia: 'ff00ff',
	gainsboro: 'dcdcdc',
	ghostwhite: 'f8f8ff',
	gold: 'ffd700',
	goldenrod: 'daa520',
	gray: '808080',
	green: '008000',
	greenyellow: 'adff2f',
	grey: '808080',
	honeydew: 'f0fff0',
	hotpink: 'ff69b4',
	indianred: 'cd5c5c',
	indigo: '4b0082',
	ivory: 'fffff0',
	khaki: 'f0e68c',
	lavender: 'e6e6fa',
	lavenderblush: 'fff0f5',
	lawngreen: '7cfc00',
	lemonchiffon: 'fffacd',
	lightblue: 'add8e6',
	lightcoral: 'f08080',
	lightcyan: 'e0ffff',
	lightgoldenrodyellow: 'fafad2',
	lightgray: 'd3d3d3',
	lightgreen: '90ee90',
	lightgrey: 'd3d3d3',
	lightpink: 'ffb6c1',
	lightsalmon: 'ffa07a',
	lightseagreen: '20b2aa',
	lightskyblue: '87cefa',
	lightslategray: '778899',
	lightslategrey: '778899',
	lightsteelblue: 'b0c4de',
	lightyellow: 'ffffe0',
	lime: '00ff00',
	limegreen: '32cd32',
	linen: 'faf0e6',
	magenta: 'ff00ff',
	maroon: '800000',
	mediumaquamarine: '66cdaa',
	mediumblue: '0000cd',
	mediumorchid: 'ba55d3',
	mediumpurple: '9370db',
	mediumseagreen: '3cb371',
	mediumslateblue: '7b68ee',
	mediumspringgreen: '00fa9a',
	mediumturquoise: '48d1cc',
	mediumvioletred: 'c71585',
	midnightblue: '191970',
	mintcream: 'f5fffa',
	mistyrose: 'ffe4e1',
	moccasin: 'ffe4b5',
	navajowhite: 'ffdead',
	navy: '000080',
	oldlace: 'fdf5e6',
	olive: '808000',
	olivedrab: '6b8e23',
	orange: 'ffa500',
	orangered: 'ff4500',
	orchid: 'da70d6',
	palegoldenrod: 'eee8aa',
	palegreen: '98fb98',
	paleturquoise: 'afeeee',
	palevioletred: 'db7093',
	papayawhip: 'ffefd5',
	peachpuff: 'ffdab9',
	peru: 'cd853f',
	pink: 'ffc0cb',
	plum: 'dda0dd',
	powderblue: 'b0e0e6',
	purple: '800080',
	rebeccapurple: '663399',
	red: 'ff0000',
	rosybrown: 'bc8f8f',
	royalblue: '4169e1',
	saddlebrown: '8b4513',
	salmon: 'fa8072',
	sandybrown: 'f4a460',
	seagreen: '2e8b57',
	seashell: 'fff5ee',
	sienna: 'a0522d',
	silver: 'c0c0c0',
	skyblue: '87ceeb',
	slateblue: '6a5acd',
	slategray: '708090',
	slategrey: '708090',
	snow: 'fffafa',
	springgreen: '00ff7f',
	steelblue: '4682b4',
	tan: 'd2b48c',
	teal: '008080',
	thistle: 'd8bfd8',
	tomato: 'ff6347',
	turquoise: '40e0d0',
	violet: 'ee82ee',
	wheat: 'f5deb3',
	white: 'ffffff',
	whitesmoke: 'f5f5f5',
	yellow: 'ffff00',
	yellowgreen: '9acd32',
}
