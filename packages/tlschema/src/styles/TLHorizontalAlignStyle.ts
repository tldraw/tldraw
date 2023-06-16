import { T } from '@tldraw/validate'
import { StyleProp } from './StyleProp'

/** @public */
export const DefaultHorizontalAlignStyle = StyleProp.defineEnum('tldraw:horizontalAlign', {
	defaultValue: 'middle',
	values: ['start', 'middle', 'end', 'start-legacy', 'end-legacy', 'middle-legacy'],
})

/** @public */
export type TLDefaultHorizontalAlignStyle = T.TypeOf<typeof DefaultHorizontalAlignStyle>
