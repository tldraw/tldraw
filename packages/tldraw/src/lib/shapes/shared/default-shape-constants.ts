import { TLDefaultSizeStyle, TLTheme } from '@tldraw/editor'

/** @internal */
export const TEXT_PROPS = {
	fontWeight: 'normal',
	fontVariant: 'normal',
	fontStyle: 'normal',
	padding: '0px',
}

/** @internal */
export const STROKE_SIZES: Record<TLDefaultSizeStyle, number> = {
	s: 1,
	m: 1.75,
	l: 2.5,
	xl: 5,
}

/** @internal */
export const FONT_SIZES: Record<TLDefaultSizeStyle, number> = {
	s: 1.125,
	m: 1.5,
	l: 2.25,
	xl: 2.75,
}

/** @internal */
export const LABEL_FONT_SIZES: Record<TLDefaultSizeStyle, number> = {
	s: 1.125,
	m: 1.375,
	l: 1.625,
	xl: 2,
}

/** @internal */
export const ARROW_LABEL_FONT_SIZES: Record<TLDefaultSizeStyle, number> = {
	s: 1.125,
	m: 1.25,
	l: 1.5,
	xl: 1.75,
}

/** @internal */
export const FONT_FAMILIES: Record<string, string> = {
	draw: 'var(--tl-font-draw)',
	sans: 'var(--tl-font-sans)',
	serif: 'var(--tl-font-serif)',
	mono: 'var(--tl-font-mono)',
}

/** @public */
export function getFontFamily(theme: TLTheme, font: string): string {
	const themeFont = theme.fonts[font as keyof typeof theme.fonts]
	if (themeFont) return themeFont.fontFamily
	return FONT_FAMILIES[font] ?? font
}

const CHECKBOX_BOX_SLOTS = 6

/**
 * The custom properties that draw task list checkboxes in a font's own style, from its theme entry.
 * Set them on an element containing rich text. Returns nothing for a font without its own
 * checkboxes, which then gets the standard ones.
 *
 * @public
 */
export function getFontCheckboxStyle(
	theme: TLTheme,
	font: string
): Record<string, string> | undefined {
	const checkbox = theme.fonts[font as keyof typeof theme.fonts]?.checkbox
	if (!checkbox) return undefined
	const style: Record<string, string> = {}
	const { boxes, tick } = checkbox
	if (boxes && boxes.length > 0) {
		// The stylesheet cycles a fixed set of slots by list position; fill them all by cycling
		// through however many boxes the font has, so three boxes run 1-2-3-1-2-3.
		for (let i = 0; i < CHECKBOX_BOX_SLOTS; i++) {
			style[`--tl-checkbox-box-${i + 1}`] = cssUrl(boxes[i % boxes.length])
		}
	}
	if (tick) style['--tl-checkbox-tick'] = cssUrl(tick)
	return style
}

function cssUrl(url: string) {
	return `url(${JSON.stringify(url)})`
}

/** @internal */
export const LABEL_TO_ARROW_PADDING = 20
/** @internal */
export const ARROW_LABEL_PADDING = 4.25
/** @internal */
export const LABEL_PADDING = 16
