import { defaultColorNames, DefaultColorThemePalette } from '@tldraw/tlschema'
import type { SequenceDB } from 'mermaid/dist/diagrams/sequence/sequenceDb.d.ts'
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

/**
 * Parse classDef colors from a Mermaid SVG string.
 *
 * Reads the `<style>` block for CSS rules containing `fill` and/or `stroke`
 * hex colors, then matches node `<g>` elements whose DOM id starts with the
 * given prefix (e.g. "state-" or "flowchart-") to extract nodeId → tldraw color.
 *
 * Prefers stroke over fill when the fill is a near-neutral color (white/black),
 * since stroke is typically the more intentional color in a classDef.
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

	// Mermaid embeds a <style>...</style> block inside the SVG with CSS rules for each shape.
	const styleMatch = svgString.match(/<style[^>]*>([\s\S]*?)<\/style>/i)
	if (!styleMatch?.[1]) return result
	const css = styleMatch[1]

	// classDef rules look like: .hot > * { fill:#ffdddd !important; stroke:#cc0000 !important }
	// We capture fill and stroke hex values (with or without !important).
	const classColors = new Map<string, { fill?: string; stroke?: string }>()
	const ruleRe = /\.([\w-]+)\s*(?:>|[\s])\s*(?:\*|\w+)\s*\{([^}]*)\}/g
	let rm: RegExpExecArray | null
	while ((rm = ruleRe.exec(css)) !== null) {
		const cls = rm[1]!
		const body = rm[2]!
		if (classColors.has(cls)) continue
		const fillMatch = body.match(/fill:\s*#([0-9a-fA-F]{3,8})/)
		const strokeMatch = body.match(/(?:^|;|\s)stroke:\s*#([0-9a-fA-F]{3,8})/)
		if (fillMatch || strokeMatch) {
			classColors.set(cls, {
				fill: fillMatch?.[1],
				stroke: strokeMatch?.[1],
			})
		}
	}

	if (classColors.size === 0) return result

	const NEUTRAL_COLORS = new Set<TLDefaultColorStyle>(['white', 'black'])

	// Escape the prefix for safe use in a regex (e.g. "flowchart-" has a literal hyphen)
	const escapedPrefix = idPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	// Match node <g> IDs like id="flowchart-myNode-42" or id="state-MyState-7"
	const idRe = new RegExp(`\\bid="${escapedPrefix}(.+)-\\d+"`)
	// Walk every <g ...> opening tag to find nodes with both an id and a class attribute
	const gTagRe = /<g\b([^>]*)>/g
	let gm: RegExpExecArray | null
	while ((gm = gTagRe.exec(svgString)) !== null) {
		const attrs = gm[1]!
		const idMatch = attrs.match(idRe)
		if (!idMatch) continue
		const nodeId = idMatch[1]!
		// Extract the class attribute value, e.g. class="node default hot"
		const classMatch = attrs.match(/\bclass="([^"]*)"/)
		if (!classMatch) continue
		for (const cls of classMatch[1]!.split(/\s+/)) {
			if (knownClasses.has(cls)) continue
			const colors = classColors.get(cls)
			if (colors) {
				const fillColor = colors.fill ? nearestTldrawColor(colors.fill) : undefined
				const strokeColor = colors.stroke ? nearestTldrawColor(colors.stroke) : undefined
				const color =
					fillColor && !NEUTRAL_COLORS.has(fillColor) ? fillColor : (strokeColor ?? fillColor)
				if (color) {
					result.set(nodeId, color)
					break
				}
			}
		}
	}

	return result
}

// ---------------------------------------------------------------------------
// Sequence diagram helpers using Mermaid's SequenceDB.LINETYPE / PLACEMENT.
// These are runtime values from the db instance, not hardcoded magic numbers.
// Source type: mermaid/dist/diagrams/sequence/sequenceDb.d.ts
// ---------------------------------------------------------------------------

export type MermaidLinetype = SequenceDB['LINETYPE']
export type MermaidPlacement = SequenceDB['PLACEMENT']

export function isSignalMessage(type: number | undefined, LT: MermaidLinetype): boolean {
	if (type === undefined) return false
	return (
		type === LT.SOLID ||
		type === LT.DOTTED ||
		type === LT.SOLID_CROSS ||
		type === LT.DOTTED_CROSS ||
		type === LT.SOLID_OPEN ||
		type === LT.DOTTED_OPEN ||
		type === LT.SOLID_POINT ||
		type === LT.DOTTED_POINT ||
		type === LT.BIDIRECTIONAL_SOLID ||
		type === LT.BIDIRECTIONAL_DOTTED
	)
}

export function isNoteMessage(type: number | undefined, LT: MermaidLinetype): boolean {
	return type === LT.NOTE
}

/** Returns the fragment keyword (e.g. "loop", "opt") if this message starts a combined fragment, or null. */
export function getFragmentStartKeyword(
	type: number | undefined,
	LT: MermaidLinetype
): string | null {
	if (type === undefined) return null
	if (type === LT.LOOP_START) return 'loop'
	if (type === LT.ALT_START) return 'alt'
	if (type === LT.OPT_START) return 'opt'
	if (type === LT.PAR_START) return 'par'
	if (type === LT.RECT_START) return 'rect'
	if (type === LT.CRITICAL_START) return 'critical'
	if (type === LT.BREAK_START) return 'break'
	if (type === LT.PAR_OVER_START) return 'par'
	return null
}

export function isFragmentEnd(type: number | undefined, LT: MermaidLinetype): boolean {
	if (type === undefined) return false
	return (
		type === LT.LOOP_END ||
		type === LT.ALT_END ||
		type === LT.OPT_END ||
		type === LT.PAR_END ||
		type === LT.RECT_END ||
		type === LT.CRITICAL_END ||
		type === LT.BREAK_END
	)
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

/** Map a Mermaid LINETYPE value to tldraw arrow props. */
export function mapLineTypeToArrowProps(
	type: number,
	LT: MermaidLinetype
): {
	dash: TLDefaultDashStyle
	arrowheadEnd: TLArrowShapeArrowheadStyle
} {
	switch (type) {
		case LT.SOLID:
			return { dash: 'solid', arrowheadEnd: 'arrow' }
		case LT.DOTTED:
			return { dash: 'dotted', arrowheadEnd: 'arrow' }
		case LT.SOLID_CROSS:
			return { dash: 'solid', arrowheadEnd: 'bar' }
		case LT.DOTTED_CROSS:
			return { dash: 'dotted', arrowheadEnd: 'bar' }
		case LT.SOLID_OPEN:
			return { dash: 'solid', arrowheadEnd: 'none' }
		case LT.DOTTED_OPEN:
			return { dash: 'dotted', arrowheadEnd: 'none' }
		case LT.SOLID_POINT:
			return { dash: 'solid', arrowheadEnd: 'arrow' }
		case LT.DOTTED_POINT:
			return { dash: 'dotted', arrowheadEnd: 'arrow' }
		case LT.BIDIRECTIONAL_SOLID:
			return { dash: 'solid', arrowheadEnd: 'arrow' }
		case LT.BIDIRECTIONAL_DOTTED:
			return { dash: 'dotted', arrowheadEnd: 'arrow' }
		default:
			return { dash: 'solid', arrowheadEnd: 'arrow' }
	}
}

export function isBidirectional(type: number, LT: MermaidLinetype): boolean {
	return type === LT.BIDIRECTIONAL_SOLID || type === LT.BIDIRECTIONAL_DOTTED
}

// ---------------------------------------------------------------------------
// CSS style parsing (for linkStyle, classDef, style directives)
// ---------------------------------------------------------------------------

function parseHexToRgb(hex: string): [number, number, number] | null {
	const h = hex.replace(/^#/, '')
	if (h.length === 3 || h.length === 4) {
		return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)]
	}
	if (h.length === 6 || h.length === 8) {
		return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
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
