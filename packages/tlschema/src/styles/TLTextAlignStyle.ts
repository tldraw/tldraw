import { T } from '@tldraw/validate'
import { StyleProp } from './StyleProp'

/** @public */
export const DefaultTextAlignStyle = StyleProp.defineEnum('tldraw:textAlign', {
	defaultValue: 'start',
	values: ['start', 'middle', 'end'],
})

/** @public */
export type TLDefaultTextAlignStyle = T.TypeOf<typeof DefaultTextAlignStyle>
