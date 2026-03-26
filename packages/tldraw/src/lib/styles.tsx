import { DefaultColorStyle, type TLTheme } from '@tldraw/editor'
import { TLUiIconJsx } from './ui/components/primitives/TldrawUiIcon'

/** @public */
export type StyleValuesForUi<T> = readonly {
	readonly value: T
	readonly icon: string | TLUiIconJsx
}[]

function isPaletteColor(value: unknown): boolean {
	return typeof value === 'object' && value !== null && 'solid' in value
}

/**
 * Returns the current list of color style items for the style panel,
 * derived from the theme's color palette. Only palette colors are included;
 * utility colors like `text`, `background`, etc. are excluded.
 *
 * Colors are ordered by their position in {@link @tldraw/tlschema#DefaultColorStyle},
 * followed by any additional theme colors in their object key order.
 *
 * @public
 */
export function getColorStyleItems(theme: TLTheme): StyleValuesForUi<string> {
	const result: StyleValuesForUi<string>[number][] = []
	const seen = new Set<string>()

	// First, add colors in the preferred order from DefaultColorStyle
	for (const name of DefaultColorStyle.values) {
		if (name in theme.colors && isPaletteColor(theme.colors[name as keyof typeof theme.colors])) {
			// we remove white here temporarily, it's an easter egg color that the panel does not yet account for
			if (name === 'white') continue
			result.push({ value: name, icon: 'color' as const })
			seen.add(name)
		}
	}

	// Then, append any remaining palette colors from the theme
	for (const [key, value] of Object.entries(theme.colors)) {
		if (!seen.has(key) && key !== 'white' && isPaletteColor(value)) {
			result.push({ value: key, icon: 'color' as const })
		}
	}

	return result
}

// todo: default styles prop?
export const STYLES = {
	fill: [
		{ value: 'none', icon: 'fill-none' },
		{ value: 'semi', icon: 'fill-semi' },
		{ value: 'solid', icon: 'fill-solid' },
	],
	fillExtra: [
		{ value: 'pattern', icon: 'fill-pattern' },
		{ value: 'lined-fill', icon: 'fill-lined-fill' },
		{ value: 'fill', icon: 'fill-fill' },
	],
	dash: [
		{ value: 'draw', icon: 'dash-draw' },
		{ value: 'dashed', icon: 'dash-dashed' },
		{ value: 'dotted', icon: 'dash-dotted' },
		{ value: 'solid', icon: 'dash-solid' },
	],
	size: [
		{ value: 's', icon: 'size-small' },
		{ value: 'm', icon: 'size-medium' },
		{ value: 'l', icon: 'size-large' },
		{ value: 'xl', icon: 'size-extra-large' },
	],
	font: [
		{ value: 'draw', icon: 'font-draw' },
		{ value: 'sans', icon: 'font-sans' },
		{ value: 'serif', icon: 'font-serif' },
		{ value: 'mono', icon: 'font-mono' },
	],
	textAlign: [
		{ value: 'start', icon: 'text-align-left' },
		{ value: 'middle', icon: 'text-align-center' },
		{ value: 'end', icon: 'text-align-right' },
	],
	horizontalAlign: [
		{ value: 'start', icon: 'horizontal-align-start' },
		{ value: 'middle', icon: 'horizontal-align-middle' },
		{ value: 'end', icon: 'horizontal-align-end' },
	],
	verticalAlign: [
		{ value: 'start', icon: 'vertical-align-start' },
		{ value: 'middle', icon: 'vertical-align-middle' },
		{ value: 'end', icon: 'vertical-align-end' },
	],
	geo: [
		{ value: 'rectangle', icon: 'geo-rectangle' },
		{ value: 'ellipse', icon: 'geo-ellipse' },
		{ value: 'triangle', icon: 'geo-triangle' },
		{ value: 'diamond', icon: 'geo-diamond' },
		{ value: 'star', icon: 'geo-star' },
		{ value: 'pentagon', icon: 'geo-pentagon' },
		{ value: 'hexagon', icon: 'geo-hexagon' },
		{ value: 'octagon', icon: 'geo-octagon' },
		{ value: 'rhombus', icon: 'geo-rhombus' },
		{ value: 'rhombus-2', icon: 'geo-rhombus-2' },
		{ value: 'oval', icon: 'geo-oval' },
		{ value: 'trapezoid', icon: 'geo-trapezoid' },
		{ value: 'arrow-left', icon: 'geo-arrow-left' },
		{ value: 'arrow-up', icon: 'geo-arrow-up' },
		{ value: 'arrow-down', icon: 'geo-arrow-down' },
		{ value: 'arrow-right', icon: 'geo-arrow-right' },
		{ value: 'cloud', icon: 'geo-cloud' },
		{ value: 'x-box', icon: 'geo-x-box' },
		{ value: 'check-box', icon: 'geo-check-box' },
		{ value: 'heart', icon: 'geo-heart' },
	],
	arrowKind: [
		{ value: 'arc', icon: 'arrow-arc' },
		{ value: 'elbow', icon: 'arrow-elbow' },
	],
	arrowheadStart: [
		{ value: 'none', icon: 'arrowhead-none' },
		{ value: 'arrow', icon: 'arrowhead-arrow' },
		{ value: 'triangle', icon: 'arrowhead-triangle' },
		{ value: 'square', icon: 'arrowhead-square' },
		{ value: 'dot', icon: 'arrowhead-dot' },
		{ value: 'diamond', icon: 'arrowhead-diamond' },
		{ value: 'inverted', icon: 'arrowhead-triangle-inverted' },
		{ value: 'bar', icon: 'arrowhead-bar' },
	],
	arrowheadEnd: [
		{ value: 'none', icon: 'arrowhead-none' },
		{ value: 'arrow', icon: 'arrowhead-arrow' },
		{ value: 'triangle', icon: 'arrowhead-triangle' },
		{ value: 'square', icon: 'arrowhead-square' },
		{ value: 'dot', icon: 'arrowhead-dot' },
		{ value: 'diamond', icon: 'arrowhead-diamond' },
		{ value: 'inverted', icon: 'arrowhead-triangle-inverted' },
		{ value: 'bar', icon: 'arrowhead-bar' },
	],
	spline: [
		{ value: 'line', icon: 'spline-line' },
		{ value: 'cubic', icon: 'spline-cubic' },
	],
} as const satisfies Record<string, StyleValuesForUi<string>>
