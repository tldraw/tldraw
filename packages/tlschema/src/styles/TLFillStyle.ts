import { T } from '@tldraw/validate'
import { StyleProp } from './StyleProp'

/** @public */
export const DefaultFillStyle = StyleProp.defineEnum(
	'tldraw:fill',
	['none', 'semi', 'solid', 'pattern'],
	{ defaultValue: 'none' }
)

/** @public */
export type TLDefaultFillStyle = T.TypeOf<typeof DefaultFillStyle>
