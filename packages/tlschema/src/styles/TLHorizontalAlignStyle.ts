import { T } from '@tldraw/validate'
import { StyleProp } from './StyleProp'

/** @public */
export const DefaultHorizontalAlignStyle = StyleProp.defineEnum({
	id: 'tldraw:horizontalAlign',
	values: ['start', 'middle', 'end', 'start-legacy', 'end-legacy', 'middle-legacy'],
	defaultValue: 'middle',
})

/** @public */
export type TLDefaultHorizontalAlignStyle = T.TypeOf<typeof DefaultHorizontalAlignStyle>
