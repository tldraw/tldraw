import { T } from '@tldraw/validate'
import { SetValue } from '../util-types'
import { TLBaseStyle } from './base-style'

/** @public */
export const TL_DASH_TYPES = new Set(['draw', 'solid', 'dashed', 'dotted'] as const)

/** @public */
export type TLDashType = SetValue<typeof TL_DASH_TYPES>

/** @public */
export interface TLDashStyle extends TLBaseStyle {
	id: TLDashType
	type: 'dash'
}

/** @internal */
export const dashValidator = T.setEnum(TL_DASH_TYPES)
