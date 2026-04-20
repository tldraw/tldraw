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

/** @internal */
export const LABEL_TO_ARROW_PADDING = 20
/** @internal */
export const ARROW_LABEL_PADDING = 4.25
/** @internal */
export const LABEL_PADDING = 16
