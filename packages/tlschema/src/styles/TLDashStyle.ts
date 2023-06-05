import { setEnumValidator } from '@tldraw/validate'
import { SetValue } from '../util-types'
import { TLBaseStyle } from './TLBaseStyle'

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
export const dashValidator = setEnumValidator(TL_DASH_TYPES)
