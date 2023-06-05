import { setEnum } from '@tldraw/validate'
import { SetValue } from '../util-types'
import { TLBaseStyle } from './TLBaseStyle'

/** @public */
export const TL_VERTICAL_ALIGN_TYPES = new Set(['start', 'middle', 'end'] as const)

/** @public */
export type TLVerticalAlignType = SetValue<typeof TL_VERTICAL_ALIGN_TYPES>

/** @public */
export interface TLVerticalAlignStyle extends TLBaseStyle {
	id: TLVerticalAlignType
	type: 'verticalAlign'
}

/** @internal */
export const verticalAlignValidator = setEnum(TL_VERTICAL_ALIGN_TYPES)
