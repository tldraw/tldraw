import { T } from '@tldraw/validate'
import { SetValue } from '../util-types'

/** @public */
export const TL_COLOR_TYPES = new Set([
	'accent',
	'white',
	'black',
	'selection-stroke',
	'selection-fill',
	'laser',
	'muted-1',
] as const)

/** @public */
export type TLColor = SetValue<typeof TL_COLOR_TYPES>
/** @public */
export const uiColorTypeValidator = T.setEnum(TL_COLOR_TYPES)
