import { T } from '@tldraw/validate'
import { StyleProp, StyleProp2 } from './StyleProp'

/** @public */
export const SizeStyle = StyleProp2('tldraw:size2')
/** @public */
export type TLSizeStyle = StyleProp2<'tldraw:size2'>

/** @public */
export const DefaultSizeStyle = StyleProp.defineEnum('tldraw:size', {
	defaultValue: 'm',
	values: ['s', 'm', 'l', 'xl'],
})

/** @public */
export type TLDefaultSizeStyle = T.TypeOf<typeof DefaultSizeStyle>
