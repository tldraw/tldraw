import { T } from '@tldraw/validate'
import { SetValue } from '../util-types'
import { TLBaseStyle } from './base-style'

/** @public */
export const TL_FONT_TYPES = new Set(['draw', 'sans', 'serif', 'mono'] as const)

/** @public */
export type TLFontType = SetValue<typeof TL_FONT_TYPES>

/** @public */
export interface TLFontStyle extends TLBaseStyle {
	id: TLFontType
	type: 'font'
}

/** @internal */
export const fontValidator = T.setEnum(TL_FONT_TYPES)
