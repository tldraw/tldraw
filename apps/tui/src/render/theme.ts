import { Editor, getColorValue } from '@tldraw/editor'
import type {
	TLDefaultColor,
	TLDefaultFillStyle,
	TLThemeColors,
	TLThemeDefaultColors,
} from '@tldraw/tlschema'
import { ParsedColor, Rgb, blend, hslToRgb, parseColor } from '../terminal/colors'

/**
 * Theme colours as packed Rgb values. tldraw's palette is a tree of CSS strings; parsing is
 * cached per theme object so a frame costs map lookups only.
 */

export type ColorMode = 'light' | 'dark'

/** The string-valued palette entries (the rest are per-colour variant objects). */
export type PaletteKey = {
	[K in keyof TLThemeDefaultColors]: TLThemeDefaultColors[K] extends string ? K : never
}[keyof TLThemeDefaultColors]

export type ColorVariant = keyof TLDefaultColor

const FALLBACK: ParsedColor = { rgb: -1, alpha: 1 }

const paletteCache = new WeakMap<TLThemeColors, Map<string, ParsedColor>>()
const variantCache = new WeakMap<TLThemeColors, Map<string, Map<string, ParsedColor>>>()

export function getThemeColors(editor: Editor, mode: ColorMode): TLThemeColors {
	return editor.getCurrentTheme().colors[mode]
}

/** A top-level palette entry (`background`, `text`, `selectionStroke`, …) with its alpha. */
export function paletteColor(colors: TLThemeColors, key: PaletteKey): ParsedColor {
	let map = paletteCache.get(colors)
	if (!map) {
		map = new Map()
		paletteCache.set(colors, map)
	}
	let parsed = map.get(key)
	if (parsed === undefined) {
		const value = colors[key] as unknown
		parsed = (typeof value === 'string' ? parseColor(value) : null) ?? FALLBACK
		map.set(key, parsed)
	}
	return parsed
}

export function paletteRgb(colors: TLThemeColors, key: PaletteKey): Rgb {
	return paletteColor(colors, key).rgb
}

/**
 * A shape colour variant via `getColorValue` (custom colour strings pass through unchanged, so
 * `#ff0000` works as a colour name).
 */
export function shapeColor(
	colors: TLThemeColors,
	color: string,
	variant: ColorVariant
): ParsedColor {
	let byVariant = variantCache.get(colors)
	if (!byVariant) {
		byVariant = new Map()
		variantCache.set(colors, byVariant)
	}
	let byColor = byVariant.get(variant)
	if (!byColor) {
		byColor = new Map()
		byVariant.set(variant, byColor)
	}
	let parsed = byColor.get(color)
	if (parsed === undefined) {
		parsed = parseColor(getColorValue(colors, color, variant)) ?? FALLBACK
		byColor.set(color, parsed)
	}
	return parsed
}

export function shapeRgb(colors: TLThemeColors, color: string, variant: ColorVariant): Rgb {
	return shapeColor(colors, color, variant).rgb
}

/**
 * How a fill style maps onto the palette (packages/tldraw/src/lib/shapes/shared/defaultFills.ts):
 * `semi` is the theme's base `solid` colour (near the background), `solid` is the colour's
 * lighter `semi` variant, and the rest use the variant of the same name.
 */
export interface FillLook {
	kind: 'none' | 'bg' | 'pattern' | 'lined'
	rgb: Rgb
	/** Labels over this fill use the theme's contrast colour. */
	contrastLabel: boolean
}

const NO_FILL: FillLook = { kind: 'none', rgb: -1, contrastLabel: false }

export function fillLook(colors: TLThemeColors, fill: TLDefaultFillStyle, color: string): FillLook {
	switch (fill) {
		case 'semi':
			return { kind: 'bg', rgb: paletteRgb(colors, 'solid'), contrastLabel: false }
		case 'solid':
			return { kind: 'bg', rgb: shapeRgb(colors, color, 'semi'), contrastLabel: false }
		case 'fill':
			return { kind: 'bg', rgb: shapeRgb(colors, color, 'fill'), contrastLabel: true }
		case 'pattern':
			return { kind: 'pattern', rgb: shapeRgb(colors, color, 'pattern'), contrastLabel: false }
		case 'lined-fill':
			return { kind: 'lined', rgb: shapeRgb(colors, color, 'linedFill'), contrastLabel: false }
		default:
			return NO_FILL
	}
}

/**
 * Label text colour: the `solid` variant of `labelColor`, except that black follows the theme's
 * text colour, and labels over a `fill` fill use the contrast colour like tldraw does.
 */
export function labelRgb(
	colors: TLThemeColors,
	labelColor: string,
	fill: TLDefaultFillStyle | null
): Rgb {
	if (fill === 'fill') return paletteRgb(colors, 'selectedContrast')
	if (labelColor === 'black') return paletteRgb(colors, 'text')
	return shapeRgb(colors, labelColor, 'solid')
}

/** The grid dot colour is a CSS variable, not a theme entry (editor.css `--tl-color-grid`). */
export function gridRgb(mode: ColorMode): Rgb {
	return mode === 'dark' ? hslToRgb(0, 0, 0.4) : hslToRgb(0, 0, 0.43)
}

/** Fades a colour toward the background for translucent shapes (box lines have no dim attribute). */
export function fadeRgb(rgb: Rgb, background: Rgb, opacity: number): Rgb {
	if (opacity >= 1 || rgb === -1) return rgb
	return blend(rgb, background, Math.max(0.2, opacity))
}
