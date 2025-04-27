import { T } from '@tldraw/validate'
import { StyleProp } from './StyleProp'

/** @public */
export const DefaultDashStyle = StyleProp.defineEnum('tldraw:dash', {
	defaultValue: 'draw',
	values: ['draw', 'solid', 'dashed', 'dotted'],
})

/** @public */
export type TLDefaultDashStyle = T.TypeOf<typeof DefaultDashStyle>
