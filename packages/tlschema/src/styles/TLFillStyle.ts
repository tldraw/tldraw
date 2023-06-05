import { setEnum } from '@tldraw/validate'
import { SetValue } from '../util-types'
import { TLBaseStyle } from './TLBaseStyle'

/** @public */
export const TL_FILL_TYPES = new Set(['none', 'semi', 'solid', 'pattern'] as const)

/** @public */
export type TLFillType = SetValue<typeof TL_FILL_TYPES>

/** @public */
export interface TLFillStyle extends TLBaseStyle {
	id: TLFillType
	type: 'fill'
}

/** @internal */
export const fillValidator = setEnum(TL_FILL_TYPES)
