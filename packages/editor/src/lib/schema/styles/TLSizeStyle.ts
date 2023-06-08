import { T } from '@tldraw/validate'
import { SetValue } from '../util-types'
import { TLBaseStyle } from './TLBaseStyle'

/** @public */
export const TL_SIZE_TYPES = new Set(['s', 'm', 'l', 'xl'] as const)

/** @public */
export type TLSizeType = SetValue<typeof TL_SIZE_TYPES>

/** @public */
export interface TLSizeStyle extends TLBaseStyle {
	id: TLSizeType
	type: 'size'
}

/** @internal */
export const sizeValidator = T.setEnum(TL_SIZE_TYPES)
