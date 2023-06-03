import { T } from '@tldraw/validate'
import { SetValue } from '../util-types'
import { TLColor, colorTypeValidator } from './TLColor'

/** @public */
export const TL_CURSOR_TYPES = new Set([
	'none',
	'default',
	'pointer',
	'cross',
	'grab',
	'rotate',
	'grabbing',
	'resize-edge',
	'resize-corner',
	'text',
	'move',
	'ew-resize',
	'ns-resize',
	'nesw-resize',
	'nwse-resize',
	'nesw-rotate',
	'nwse-rotate',
	'swne-rotate',
	'senw-rotate',
	'zoom-in',
	'zoom-out',
])

/** @public */
export type TLCursorType = SetValue<typeof TL_CURSOR_TYPES>
/** @public */
export const cursorTypeValidator = T.setEnum(TL_CURSOR_TYPES)

/** @public */
export interface TLCursor {
	color: TLColor
	type: TLCursorType
	rotation: number
}

/** @public */
export const cursorValidator: T.Validator<TLCursor> = T.object({
	color: colorTypeValidator,
	type: cursorTypeValidator,
	rotation: T.number,
})
