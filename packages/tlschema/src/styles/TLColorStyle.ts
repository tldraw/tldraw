import { T } from '@tldraw/validate'
import { SetValue } from '../util-types'
import { TLBaseStyle } from './TLBaseStyle'

/** @public */
export const TL_COLOR_TYPES = new Set([
	'black',
	'grey',
	'light-violet',
	'violet',
	'blue',
	'light-blue',
	'yellow',
	'orange',
	'green',
	'light-green',
	'light-red',
	'red',
] as const)

/** @public */
export type TLColorType = SetValue<typeof TL_COLOR_TYPES>

/** @public */
export interface TLColorStyle extends TLBaseStyle {
	id: TLColorType
	type: 'color'
}

/** @internal */
export const colorValidator = T.setEnum(TL_COLOR_TYPES)
