import { TLFontFace } from '@tldraw/editor'

export interface TLDefaultFont {
	normal: {
		'500': TLFontFace
		'700': TLFontFace
	}
	italic: {
		'500': TLFontFace
		'700': TLFontFace
	}
}
export interface TLDefaultFonts {
	tldraw_draw: TLDefaultFont
	tldraw_sans: TLDefaultFont
	tldraw_serif: TLDefaultFont
	tldraw_mono: TLDefaultFont
}

const drawFont: TLFontFace = {
	fontFamily: 'tldraw_draw',
	src: { url: 'tldraw_draw', format: 'woff2' },
	weight: '500 700',
}

export const DefaultFontFamilies: TLDefaultFonts = {
	tldraw_draw: {
		normal: {
			'500': drawFont,
			'700': drawFont,
		},
		italic: {
			'500': drawFont,
			'700': drawFont,
		},
	},
	tldraw_sans: {
		normal: {
			'500': {
				fontFamily: 'tldraw_sans',
				src: { url: 'tldraw_sans_normal_500', format: 'woff2' },
				weight: '500',
				style: 'normal',
			},
			'700': {
				fontFamily: 'tldraw_sans',
				src: { url: 'tldraw_sans_normal_700', format: 'woff2' },
				weight: '700',
				style: 'normal',
			},
		},
		italic: {
			'500': {
				fontFamily: 'tldraw_sans',
				src: { url: 'tldraw_sans_italic_500', format: 'woff2' },
				weight: '500',
				style: 'italic',
			},
			'700': {
				fontFamily: 'tldraw_sans',
				src: { url: 'tldraw_sans_italic_700', format: 'woff2' },
				weight: '700',
				style: 'italic',
			},
		},
	},
	tldraw_serif: {
		normal: {
			'500': {
				fontFamily: 'tldraw_serif',
				src: { url: 'tldraw_serif_normal_500', format: 'woff2' },
				weight: '500',
				style: 'normal',
			},
			'700': {
				fontFamily: 'tldraw_serif',
				src: { url: 'tldraw_serif_normal_700', format: 'woff2' },
				weight: '700',
				style: 'normal',
			},
		},
		italic: {
			'500': {
				fontFamily: 'tldraw_serif',
				src: { url: 'tldraw_serif_italic_500', format: 'woff2' },
				weight: '500',
				style: 'italic',
			},
			'700': {
				fontFamily: 'tldraw_serif',
				src: { url: 'tldraw_serif_italic_700', format: 'woff2' },
				weight: '700',
				style: 'italic',
			},
		},
	},
	tldraw_mono: {
		normal: {
			'500': {
				fontFamily: 'tldraw_mono',
				src: { url: 'tldraw_mono_normal_500', format: 'woff2' },
				weight: '500',
				style: 'normal',
			},
			'700': {
				fontFamily: 'tldraw_mono',
				src: { url: 'tldraw_mono_normal_700', format: 'woff2' },
				weight: '700',
				style: 'normal',
			},
		},
		italic: {
			'500': {
				fontFamily: 'tldraw_mono',
				src: { url: 'tldraw_mono_italic_500', format: 'woff2' },
				weight: '500',
				style: 'italic',
			},
			'700': {
				fontFamily: 'tldraw_mono',
				src: { url: 'tldraw_mono_italic_700', format: 'woff2' },
				weight: '700',
				style: 'italic',
			},
		},
	},
}
