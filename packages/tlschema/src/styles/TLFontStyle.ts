import { T } from '@tldraw/validate'
import { StyleProp } from './StyleProp'

/** @public */
export const DefaultFontStyle = StyleProp.defineEnum('tldraw:font', {
	defaultValue: 'draw',
	values: ['draw', 'sans', 'serif', 'mono'],
})

/** @public */
export type TLDefaultFontStyle = T.TypeOf<typeof DefaultFontStyle>
