import { T } from '@tldraw/validate'
import { StyleProp } from './StyleProp'

/** @public */
export const DefaultFontStyle = StyleProp.defineEnum({
	id: 'tldraw:font',
	values: ['draw', 'sans', 'serif', 'mono'],
	defaultValue: 'draw',
})

/** @public */
export type TLDefaultFontStyle = T.TypeOf<typeof DefaultFontStyle>
