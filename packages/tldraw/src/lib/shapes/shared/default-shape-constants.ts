import { TLDefaultFontStyle, TLDefaultSizeStyle } from '@tldraw/editor'

/** @public */
export const TEXT_PROPS = {
	lineHeight: 1.35,
	fontWeight: 'normal',
	fontVariant: 'normal',
	fontStyle: 'normal',
	padding: '0px',
}

/** @public @deprecated Use `editor.getShapeStyles(shape).strokeWidth` instead. */
export const STROKE_SIZES: Record<TLDefaultSizeStyle, number> = {
	s: 2,
	m: 3.5,
	l: 5,
	xl: 10,
}

/** @public @deprecated Use `editor.getShapeStyles(shape).fontSize` instead. */
export const FONT_SIZES: Record<TLDefaultSizeStyle, number> = {
	s: 18,
	m: 24,
	l: 36,
	xl: 44,
}

/** @public @deprecated Use `editor.getShapeStyles(shape).labelFontSize` instead. */
export const LABEL_FONT_SIZES: Record<TLDefaultSizeStyle, number> = {
	s: 18,
	m: 22,
	l: 26,
	xl: 32,
}

/** @public @deprecated Use `editor.getShapeStyles(shape).labelFontSize` instead. */
export const ARROW_LABEL_FONT_SIZES: Record<TLDefaultSizeStyle, number> = {
	s: 18,
	m: 20,
	l: 24,
	xl: 28,
}

/** @public @deprecated Use `editor.getShapeStyles(shape).fontFamily` instead. */
export const FONT_FAMILIES: Record<TLDefaultFontStyle, string> = {
	draw: 'var(--tl-font-draw)',
	sans: 'var(--tl-font-sans)',
	serif: 'var(--tl-font-serif)',
	mono: 'var(--tl-font-mono)',
}

/** @internal */
export const LABEL_TO_ARROW_PADDING = 20
/** @internal */
export const ARROW_LABEL_PADDING = 4.25
/** @internal */
export const LABEL_PADDING = 16
