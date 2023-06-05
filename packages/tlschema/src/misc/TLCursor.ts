import { TypeValidator, numberValidator, objectValidator, setEnumValidator } from '@tldraw/validate'
import { SetValue } from '../util-types'
import { TLColor, colorTypeValidator } from './TLColor'

/**
 * The cursor types used by tldraw's default shapes.
 *
 * @public */
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

/**
 * A type for the cursor types used by tldraw's default shapes.
 *
 *  @public */
export type TLCursorType = SetValue<typeof TL_CURSOR_TYPES>

/** @internal */
export const cursorTypeValidator = setEnumValidator(TL_CURSOR_TYPES)

/**
 * A cursor used by tldraw.
 *
 *  @public */
export interface TLCursor {
	color: TLColor
	type: TLCursorType
	rotation: number
}

/** @internal */
export const cursorValidator: TypeValidator<TLCursor> = objectValidator({
	color: colorTypeValidator,
	type: cursorTypeValidator,
	rotation: numberValidator,
})
