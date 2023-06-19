import { T } from '@tldraw/validate'
import { StyleProp } from './StyleProp'

/** @public */
export const DefaultDashStyle = StyleProp.defineEnum({
	id: 'tldraw:dash',
	values: ['draw', 'solid', 'dashed', 'dotted'],
	defaultValue: 'draw',
})

/** @public */
export type TLDefaultDashStyle = T.TypeOf<typeof DefaultDashStyle>
