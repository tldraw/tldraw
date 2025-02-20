import { objectMapValues, TLFontFace } from '@tldraw/editor'

/** @public */
export interface TLDefaultFont {
	normal: {
		normal: TLFontFace
		bold: TLFontFace
	}
	italic: {
		normal: TLFontFace
		bold: TLFontFace
	}
}
/** @public */
export interface TLDefaultFonts {
	tldraw_draw: TLDefaultFont
	tldraw_sans: TLDefaultFont
	tldraw_serif: TLDefaultFont
	tldraw_mono: TLDefaultFont
}

/** @public */
export const DefaultFontFaces: TLDefaultFonts = {
	tldraw_draw: {
		normal: {
			normal: {
				fontFamily: 'tldraw_draw',
				src: { url: 'tldraw_draw', format: 'woff2' },
				weight: 'normal',
			},
			bold: {
				fontFamily: 'tldraw_draw',
				src: { url: 'tldraw_draw_bold', format: 'woff2' },
				weight: 'bold',
			},
		},
		italic: {
			normal: {
				fontFamily: 'tldraw_draw',
				src: { url: 'tldraw_draw_italic', format: 'woff2' },
				weight: 'normal',
				style: 'italic',
			},
			bold: {
				fontFamily: 'tldraw_draw',
				src: { url: 'tldraw_draw_italic_bold', format: 'woff2' },
				weight: 'bold',
				style: 'italic',
			},
		},
	},
	tldraw_sans: {
		normal: {
			normal: {
				fontFamily: 'tldraw_sans',
				src: { url: 'tldraw_sans', format: 'woff2' },
				weight: 'normal',
				style: 'normal',
			},
			bold: {
				fontFamily: 'tldraw_sans',
				src: { url: 'tldraw_sans_bold', format: 'woff2' },
				weight: 'bold',
				style: 'normal',
			},
		},
		italic: {
			normal: {
				fontFamily: 'tldraw_sans',
				src: { url: 'tldraw_sans_italic', format: 'woff2' },
				weight: 'normal',
				style: 'italic',
			},
			bold: {
				fontFamily: 'tldraw_sans',
				src: { url: 'tldraw_sans_italic_bold', format: 'woff2' },
				weight: 'bold',
				style: 'italic',
			},
		},
	},
	tldraw_serif: {
		normal: {
			normal: {
				fontFamily: 'tldraw_serif',
				src: { url: 'tldraw_serif', format: 'woff2' },
				weight: 'normal',
				style: 'normal',
			},
			bold: {
				fontFamily: 'tldraw_serif',
				src: { url: 'tldraw_serif_bold', format: 'woff2' },
				weight: 'bold',
				style: 'normal',
			},
		},
		italic: {
			normal: {
				fontFamily: 'tldraw_serif',
				src: { url: 'tldraw_serif_italic', format: 'woff2' },
				weight: 'normal',
				style: 'italic',
			},
			bold: {
				fontFamily: 'tldraw_serif',
				src: { url: 'tldraw_serif_italic_bold', format: 'woff2' },
				weight: 'bold',
				style: 'italic',
			},
		},
	},
	tldraw_mono: {
		normal: {
			normal: {
				fontFamily: 'tldraw_mono',
				src: { url: 'tldraw_mono', format: 'woff2' },
				weight: 'normal',
				style: 'normal',
			},
			bold: {
				fontFamily: 'tldraw_mono',
				src: { url: 'tldraw_mono_bold', format: 'woff2' },
				weight: 'bold',
				style: 'normal',
			},
		},
		italic: {
			normal: {
				fontFamily: 'tldraw_mono',
				src: { url: 'tldraw_mono_italic', format: 'woff2' },
				weight: 'normal',
				style: 'italic',
			},
			bold: {
				fontFamily: 'tldraw_mono',
				src: { url: 'tldraw_mono_italic_bold', format: 'woff2' },
				weight: 'bold',
				style: 'italic',
			},
		},
	},
}

/** @public */
export const allDefaultFontFaces = objectMapValues(DefaultFontFaces).flatMap((font) =>
	objectMapValues(font).flatMap((fontFace) => Object.values(fontFace))
)
