import { T } from '@tldraw/validate'
import { SetValue } from '../util-types'
import { TLBaseStyle } from './base-style'

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
export const verticalAlignValidator = T.setEnum(TL_VERTICAL_ALIGN_TYPES)
