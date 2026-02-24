import {
	TLArrowShapeArrowheadStyle,
	TLDefaultColorStyle,
	TLDefaultDashStyle,
	TLDefaultSizeStyle,
	TLGeoShape,
} from 'tldraw'

export function mapEdgeTypeToArrowhead(type: string | undefined): TLArrowShapeArrowheadStyle {
	if (!type) return 'arrow'

	if (type.includes('point')) return 'arrow'
	if (type.includes('circle')) return 'dot'
	if (type.includes('cross')) return 'bar'
	if (type.includes('open')) return 'none'

	return 'arrow'
}

export function mapFlowShapeTypeToGeo(type: string | undefined): TLGeoShape['props']['geo'] {
	switch (type) {
		case 'diamond':
			return 'diamond'
		case 'ellipse':
		case 'circle':
		case 'doublecircle':
		case 'stadium':
		case 'cylinder':
			return 'ellipse'
		case 'hexagon':
			return 'hexagon'
		case 'trapezoid':
		// TODO: implement inv_trapezoid in SDK
		case 'inv_trapezoid':
			return 'trapezoid'
		case 'lean_right':
			return 'rhombus'
		case 'lean_left':
			return 'rhombus-2'
		case 'square':
		case 'rect':
		case 'round':
		case 'subroutine':
		default:
			return 'rectangle'
	}
}

export function mapEdgeStrokeToDash(stroke: string | undefined): TLDefaultDashStyle {
	if (!stroke) return 'solid'
	if (stroke === 'dotted') return 'dotted'
	return 'solid'
}

export function mapStateTypeToGeo(type: string): TLGeoShape['props']['geo'] {
	switch (type) {
		case 'choice':
			return 'diamond'
		case 'start':
		case 'end':
			return 'ellipse'
		default:
			return 'rectangle'
	}
}

// ---------------------------------------------------------------------------
// classDef: shared helper to extract fill colors from Mermaid SVG strings
// ---------------------------------------------------------------------------

const HEX_TO_TLDRAW_COLOR: Record<string, TLDefaultColorStyle> = {
	'000000': 'black',
	'333333': 'black',
	ffffff: 'white',
	ececff: 'light-violet',
	'0000ff': 'blue',
	'00ff00': 'green',
	ff0000: 'red',
	ffff00: 'yellow',
	ffa500: 'orange',
	e8f4f8: 'light-blue',
	d4edda: 'light-green',
	f8d7da: 'light-red',
	e2d5f1: 'light-violet',
	'9370db': 'violet',
}

function hexToTldrawColor(hex: string): TLDefaultColorStyle | undefined {
	const h = hex.replace(/^#/, '').toLowerCase()
	const normalized = h.length === 3 ? h[0]! + h[0] + h[1]! + h[1] + h[2]! + h[2] : h.slice(0, 6)
	return HEX_TO_TLDRAW_COLOR[normalized]
}

/**
 * Parse classDef fill colors from a Mermaid SVG string.
 *
 * Reads the <style> block for rules with `fill:#HEX!important` (only classDef
 * rules use !important), then matches node <g> elements whose DOM id starts
 * with the given prefix (e.g. "state-" or "flowchart-") to extract nodeId→class.
 *
 * @param idPrefix - The prefix Mermaid uses for node DOM ids (e.g. "state-", "flowchart-")
 * @param knownClasses - Built-in CSS classes to skip (e.g. "node", "statediagram-state")
 */
export function parseClassDefFills(
	svgString: string,
	idPrefix: string,
	knownClasses: Set<string>
): Map<string, TLDefaultColorStyle> {
	const result = new Map<string, TLDefaultColorStyle>()

	const styleMatch = svgString.match(/<style[^>]*>([\s\S]*?)<\/style>/i)
	if (!styleMatch?.[1]) return result
	const css = styleMatch[1]

	const classFills = new Map<string, string>()
	const ruleRe = /\.([\w-]+)\s*(?:>|[\s])\s*(?:\*|\w+)\s*\{([^}]*)\}/g
	let rm: RegExpExecArray | null
	while ((rm = ruleRe.exec(css)) !== null) {
		const cls = rm[1]!
		const body = rm[2]!
		const fillMatch = body.match(/fill:\s*#([0-9a-fA-F]{3,6})\s*!important/)
		if (fillMatch && !classFills.has(cls)) {
			classFills.set(cls, fillMatch[1]!)
		}
	}

	if (classFills.size === 0) return result

	const escapedPrefix = idPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	const idRe = new RegExp(`\\bid="${escapedPrefix}(.+)-\\d+"`)
	const gTagRe = /<g\b([^>]*)>/g
	let gm: RegExpExecArray | null
	while ((gm = gTagRe.exec(svgString)) !== null) {
		const attrs = gm[1]!
		const idMatch = attrs.match(idRe)
		if (!idMatch) continue
		const nodeId = idMatch[1]!
		const classMatch = attrs.match(/\bclass="([^"]*)"/)
		if (!classMatch) continue
		for (const cls of classMatch[1]!.split(/\s+/)) {
			if (knownClasses.has(cls)) continue
			const hex = classFills.get(cls)
			if (hex) {
				const color = hexToTldrawColor(hex)
				if (color) {
					result.set(nodeId, color)
					break
				}
			}
		}
	}

	return result
}

// Sequence diagram line types (from SequenceDB.LINETYPE)
const SIGNAL_TYPES = new Set([0, 1, 3, 4, 5, 6, 24, 25, 33, 34])
const LINETYPE_NOTE = 2

// Combined fragment start types → keyword label
const FRAGMENT_START_TYPES: Record<number, string> = {
	10: 'loop',
	12: 'alt',
	15: 'opt',
	19: 'par',
	22: 'rect',
	27: 'critical',
	30: 'break',
	32: 'par',
}
const FRAGMENT_END_TYPES = new Set([11, 14, 16, 21, 23, 29, 31])

// Sequence diagram note placement (from SequenceDB.PLACEMENT)
export const PLACEMENT_LEFT = 0
export const PLACEMENT_RIGHT = 1
export const PLACEMENT_OVER = 2

export function isSignalMessage(type: number | undefined): boolean {
	return type !== undefined && SIGNAL_TYPES.has(type)
}

export function isNoteMessage(type: number | undefined): boolean {
	return type === LINETYPE_NOTE
}

/** Returns the fragment keyword (e.g. "loop", "opt") if this message starts a combined fragment, or null. */
export function getFragmentStartKeyword(type: number | undefined): string | null {
	if (type === undefined) return null
	return FRAGMENT_START_TYPES[type] ?? null
}

export function isFragmentEnd(type: number | undefined): boolean {
	return type !== undefined && FRAGMENT_END_TYPES.has(type)
}

export function mapParticipantTypeToGeo(type: string): TLGeoShape['props']['geo'] {
	switch (type) {
		case 'actor':
			return 'ellipse'
		case 'database':
			return 'oval'
		default:
			return 'rectangle'
	}
}

export function mapLineTypeToArrowProps(type: number): {
	dash: TLDefaultDashStyle
	arrowheadEnd: TLArrowShapeArrowheadStyle
} {
	switch (type) {
		case 0: // SOLID
			return { dash: 'solid', arrowheadEnd: 'arrow' }
		case 1: // DOTTED
			return { dash: 'dotted', arrowheadEnd: 'arrow' }
		case 3: // SOLID_CROSS
			return { dash: 'solid', arrowheadEnd: 'bar' }
		case 4: // DOTTED_CROSS
			return { dash: 'dotted', arrowheadEnd: 'bar' }
		case 5: // SOLID_OPEN
			return { dash: 'solid', arrowheadEnd: 'none' }
		case 6: // DOTTED_OPEN
			return { dash: 'dotted', arrowheadEnd: 'none' }
		case 24: // SOLID_POINT
			return { dash: 'solid', arrowheadEnd: 'arrow' }
		case 25: // DOTTED_POINT
			return { dash: 'dotted', arrowheadEnd: 'arrow' }
		case 33: // BIDIRECTIONAL_SOLID
			return { dash: 'solid', arrowheadEnd: 'arrow' }
		case 34: // BIDIRECTIONAL_DOTTED
			return { dash: 'dotted', arrowheadEnd: 'arrow' }
		default:
			return { dash: 'solid', arrowheadEnd: 'arrow' }
	}
}

export function isBidirectional(type: number): boolean {
	return type === 33 || type === 34
}

// ---------------------------------------------------------------------------
// CSS style parsing (for linkStyle, classDef, style directives)
// ---------------------------------------------------------------------------

// tldraw light-mode solid hex values (hard-coded to avoid importing the full palette)
const TLDRAW_PALETTE: [TLDefaultColorStyle, number, number, number][] = [
	['black', 0x1d, 0x1d, 0x1d],
	['grey', 0x9f, 0xa8, 0xb2],
	['blue', 0x44, 0x65, 0xe9],
	['light-blue', 0x4b, 0xa1, 0xf1],
	['green', 0x09, 0x92, 0x68],
	['light-green', 0x4c, 0xb0, 0x5e],
	['red', 0xe0, 0x31, 0x31],
	['light-red', 0xf8, 0x77, 0x77],
	['orange', 0xe1, 0x69, 0x19],
	['yellow', 0xf1, 0xac, 0x4b],
	['violet', 0xae, 0x3e, 0xc9],
	['light-violet', 0xe0, 0x85, 0xf4],
	['white', 0xff, 0xff, 0xff],
]

function parseHexToRgb(hex: string): [number, number, number] | null {
	const h = hex.replace(/^#/, '')
	if (h.length === 3) {
		return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)]
	}
	if (h.length === 6) {
		return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
	}
	return null
}

/** Map an arbitrary hex color to the nearest tldraw named color (best-effort). */
function nearestTldrawColor(hex: string): TLDefaultColorStyle {
	const rgb = parseHexToRgb(hex)
	if (!rgb) return 'black'

	let best: TLDefaultColorStyle = 'black'
	let bestDist = Infinity
	for (const [name, r, g, b] of TLDRAW_PALETTE) {
		const dr = rgb[0] - r
		const dg = rgb[1] - g
		const db = rgb[2] - b
		const dist = dr * dr + dg * dg + db * db
		if (dist < bestDist) {
			bestDist = dist
			best = name
		}
	}
	return best
}

export interface ParsedCssOverrides {
	color?: TLDefaultColorStyle
	dashOverride?: TLDefaultDashStyle
	sizeOverride?: TLDefaultSizeStyle
}

/**
 * Parse a Mermaid CSS style array (from FlowEdge.style, FlowVertex.styles, etc.)
 * and return tldraw-compatible overrides. Only returns fields that were found.
 */
export function parseCssStyles(styles: string[] | undefined): ParsedCssOverrides {
	if (!styles || styles.length === 0) return {}

	const props = new Map<string, string>()
	for (const entry of styles) {
		for (const part of entry.split(';')) {
			const colon = part.indexOf(':')
			if (colon < 0) continue
			const key = part.slice(0, colon).trim().toLowerCase()
			const val = part.slice(colon + 1).trim()
			if (key && val) props.set(key, val)
		}
	}

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
		const px = parseFloat(strokeWidth)
		if (Number.isFinite(px)) {
			if (px <= 1) result.sizeOverride = 's'
			else if (px <= 2) result.sizeOverride = 'm'
			else result.sizeOverride = 'l'
		}
	}

	return result
}
