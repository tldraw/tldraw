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

/**
 * Parse classDef colors from a Mermaid SVG string.
 *
 * Reads the `<style>` block for CSS rules containing `fill` and/or `stroke`
 * hex colors, then matches node `<g>` elements whose DOM id starts with the
 * given prefix (e.g. "state-" or "flowchart-") to extract nodeId -> tldraw color.
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

	const styleMatch = svgString.match(/<style[^>]*>([\s\S]*?)<\/style>/i)
	if (!styleMatch?.[1]) return result
	const css = styleMatch[1]

	const classColors = new Map<string, { fill?: string; stroke?: string }>()
	const ruleRegex = /\.([\w-]+)\s*(?:>|[\s])\s*(?:\*|\w+)\s*\{([^}]*)\}/g
	let ruleMatch: RegExpExecArray | null
	while ((ruleMatch = ruleRegex.exec(css)) !== null) {
		const className = ruleMatch[1]!
		const body = ruleMatch[2]!
		if (classColors.has(className)) continue
		const fillMatch = body.match(/fill:\s*#([0-9a-fA-F]{3,8})/)
		const strokeMatch = body.match(/(?:^|;|\s)stroke:\s*#([0-9a-fA-F]{3,8})/)
		if (fillMatch || strokeMatch) {
			classColors.set(className, { fill: fillMatch?.[1], stroke: strokeMatch?.[1] })
		}
	}

	if (classColors.size === 0) return result

	const NEUTRAL_COLORS = new Set<TLDefaultColorStyle>(['white', 'black'])

	const escapedPrefix = idPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	const idRegex = new RegExp(`\\bid="${escapedPrefix}(.+)-\\d+"`)
	const tagRegex = /<g\b([^>]*)>/g
	let tagMatch: RegExpExecArray | null
	while ((tagMatch = tagRegex.exec(svgString)) !== null) {
		const attrs = tagMatch[1]!
		const idMatch = attrs.match(idRegex)
		if (!idMatch) continue
		const nodeId = idMatch[1]!
		const classMatch = attrs.match(/\bclass="([^"]*)"/)
		if (!classMatch) continue
		for (const className of classMatch[1]!.split(/\s+/)) {
			if (knownClasses.has(className)) continue
			const colors = classColors.get(className)
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

export type MermaidLinetype = SequenceDB['LINETYPE']
export type MermaidPlacement = SequenceDB['PLACEMENT']

export function isSignalMessage(type: number | undefined, lineType: MermaidLinetype): boolean {
	if (type === undefined) return false
	const signalTypes: number[] = [
		lineType.SOLID,
		lineType.DOTTED,
		lineType.SOLID_CROSS,
		lineType.DOTTED_CROSS,
		lineType.SOLID_OPEN,
		lineType.DOTTED_OPEN,
		lineType.SOLID_POINT,
		lineType.DOTTED_POINT,
		lineType.BIDIRECTIONAL_SOLID,
		lineType.BIDIRECTIONAL_DOTTED,
	]
	return signalTypes.includes(type)
}

export function isNoteMessage(type: number | undefined, lineType: MermaidLinetype): boolean {
	return type === lineType.NOTE
}

/** Returns the fragment keyword (e.g. "loop", "opt") if this message starts a combined fragment, or null. */
export function getFragmentStartKeyword(
	type: number | undefined,
	lineType: MermaidLinetype
): string | null {
	if (type === undefined) return null
	if (type === lineType.LOOP_START) return 'loop'
	if (type === lineType.ALT_START) return 'alt'
	if (type === lineType.OPT_START) return 'opt'
	if (type === lineType.PAR_START) return 'par'
	if (type === lineType.RECT_START) return 'rect'
	if (type === lineType.CRITICAL_START) return 'critical'
	if (type === lineType.BREAK_START) return 'break'
	if (type === lineType.PAR_OVER_START) return 'par'
	return null
}

export function isFragmentEnd(type: number | undefined, lineType: MermaidLinetype): boolean {
	if (type === undefined) return false
	const endTypes: number[] = [
		lineType.LOOP_END,
		lineType.ALT_END,
		lineType.OPT_END,
		lineType.PAR_END,
		lineType.RECT_END,
		lineType.CRITICAL_END,
		lineType.BREAK_END,
	]
	return endTypes.includes(type)
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
	lineType: MermaidLinetype
): {
	dash: TLDefaultDashStyle
	arrowheadEnd: TLArrowShapeArrowheadStyle
} {
	switch (type) {
		case lineType.SOLID:
			return { dash: 'solid', arrowheadEnd: 'arrow' }
		case lineType.DOTTED:
			return { dash: 'dotted', arrowheadEnd: 'arrow' }
		case lineType.SOLID_CROSS:
			return { dash: 'solid', arrowheadEnd: 'bar' }
		case lineType.DOTTED_CROSS:
			return { dash: 'dotted', arrowheadEnd: 'bar' }
		case lineType.SOLID_OPEN:
			return { dash: 'solid', arrowheadEnd: 'none' }
		case lineType.DOTTED_OPEN:
			return { dash: 'dotted', arrowheadEnd: 'none' }
		case lineType.SOLID_POINT:
			return { dash: 'solid', arrowheadEnd: 'arrow' }
		case lineType.DOTTED_POINT:
			return { dash: 'dotted', arrowheadEnd: 'arrow' }
		case lineType.BIDIRECTIONAL_SOLID:
			return { dash: 'solid', arrowheadEnd: 'arrow' }
		case lineType.BIDIRECTIONAL_DOTTED:
			return { dash: 'dotted', arrowheadEnd: 'arrow' }
		default:
			return { dash: 'solid', arrowheadEnd: 'arrow' }
	}
}

export function isBidirectional(type: number, lineType: MermaidLinetype): boolean {
	return type === lineType.BIDIRECTIONAL_SOLID || type === lineType.BIDIRECTIONAL_DOTTED
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
		const deltaR = rgb[0] - red
		const deltaG = rgb[1] - green
		const deltaB = rgb[2] - blue
		const distance = deltaR * deltaR + deltaG * deltaG + deltaB * deltaB
		if (distance < bestDistance) {
			bestDistance = distance
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
			const value = part.slice(colon + 1).trim()
			if (key && value) props.set(key, value)
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
		const pixels = parseFloat(strokeWidth)
		if (Number.isFinite(pixels)) {
			if (pixels <= 1) result.sizeOverride = 's'
			else if (pixels <= 2) result.sizeOverride = 'm'
			else result.sizeOverride = 'l'
		}
	}

	return result
}
