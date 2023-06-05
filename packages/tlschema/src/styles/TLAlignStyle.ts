import { setEnumValidator } from '@tldraw/validate'
import { SetValue } from '../util-types'
import { TLBaseStyle } from './TLBaseStyle'

/** @public */
export const TL_ALIGN_TYPES = new Set(['start', 'middle', 'end'] as const)

/** @internal */
export const TL_ALIGN_TYPES_WITH_LEGACY_STUFF = new Set([
	...TL_ALIGN_TYPES,
	'start-legacy',
	'end-legacy',
	'middle-legacy',
] as const)

/** @public */
export type TLAlignType = SetValue<typeof TL_ALIGN_TYPES>

/** @public */
export interface TLAlignStyle extends TLBaseStyle {
	id: TLAlignType
	type: 'align'
}

/** @internal */
export const alignValidator = setEnumValidator<TLAlignType>(
	TL_ALIGN_TYPES_WITH_LEGACY_STUFF as Set<TLAlignType>
)
