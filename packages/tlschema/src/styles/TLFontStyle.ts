import { T } from '@tldraw/validate'
import { StyleProp } from './StyleProp'

/** @public */
export const DefaultFontStyle = StyleProp.defineEnum('tldraw:font', {
	// 💡❗ If you remove a value from this enum, make sure you also add a migration.
	// 💡❗ (see the tlschema README.md for instructions)
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
