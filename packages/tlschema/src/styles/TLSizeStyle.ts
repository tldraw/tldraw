import { T } from '@tldraw/validate'
import { StyleProp } from './StyleProp'

/** @public */
export const DefaultSizeStyle = StyleProp.defineEnum({
	id: 'tldraw:size',
	values: ['s', 'm', 'l', 'xl'],
	defaultValue: 'm',
})

/** @public */
export type TLDefaultSizeStyle = T.TypeOf<typeof DefaultSizeStyle>
