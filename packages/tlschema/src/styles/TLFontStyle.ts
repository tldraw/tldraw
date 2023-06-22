import { T } from '@tldraw/validate'
import { StyleProp } from './StyleProp'

/** @public */
export const DefaultFontStyle = StyleProp.defineEnum('tldraw:font', {
	defaultValue: 'draw',
	values: ['draw', 'sans', 'serif', 'mono'],
})

/** @public */
export type TLDefaultFontStyle = T.TypeOf<typeof DefaultFontStyle>

/** @public */
export const DefaultFontFamilies = {
	draw: "'tldraw_draw', sans-serif",
	sans: "'tldraw_sans', sans-serif",
	serif: "'tldraw_serif', serif",
	mono: "'tldraw_mono', monospace",
}
