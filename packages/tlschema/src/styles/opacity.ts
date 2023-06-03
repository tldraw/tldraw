import { T } from '@tldraw/validate'
import { SetValue } from '../util-types'
import { TLBaseStyle } from './base-style'

/** @public */
export const TL_OPACITY_TYPES = new Set(['0.1', '0.25', '0.5', '0.75', '1'] as const)

/** @public */
export type TLOpacityType = SetValue<typeof TL_OPACITY_TYPES>

/** @public */
export interface TLOpacityStyle extends TLBaseStyle {
	id: TLOpacityType
	type: 'opacity'
}

/** @internal */
export const opacityValidator = T.setEnum(TL_OPACITY_TYPES)
