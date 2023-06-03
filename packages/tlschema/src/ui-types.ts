import { T } from '@tldraw/validate'
import { Vec2dModel } from './geometry-types'
import { SetValue } from './util-types'

/** @public */
export const TL_UI_COLOR_TYPES = new Set([
	'accent',
	'white',
	'black',
	'selection-stroke',
	'selection-fill',
	'laser',
	'muted-1',
] as const)

/** @public */
export type TLUiColorType = SetValue<typeof TL_UI_COLOR_TYPES>
/** @public */
export const uiColorTypeValidator = T.setEnum(TL_UI_COLOR_TYPES)

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
	color: TLUiColorType
	type: TLCursorType
	rotation: number
}
/** @public */
export const cursorValidator: T.Validator<TLCursor> = T.object({
	color: uiColorTypeValidator,
	type: cursorTypeValidator,
	rotation: T.number,
})

/** @public */
export const TL_SCRIBBLE_STATES = new Set(['starting', 'paused', 'active', 'stopping'] as const)

/** @public */
export type TLScribble = {
	points: Vec2dModel[]
	size: number
	color: TLUiColorType
	opacity: number
	state: SetValue<typeof TL_SCRIBBLE_STATES>
	delay: number
}

/** @public */
export const scribbleTypeValidator: T.Validator<TLScribble> = T.object({
	points: T.arrayOf(T.point),
	size: T.positiveNumber,
	color: uiColorTypeValidator,
	opacity: T.number,
	state: T.setEnum(TL_SCRIBBLE_STATES),
	delay: T.number,
})

/** @public */
export const TL_HANDLE_TYPES = new Set(['vertex', 'virtual', 'create'] as const)

/** @public */
export type TLHandleType = SetValue<typeof TL_HANDLE_TYPES>

/**
 * A base interface for a shape's handles.
 *
 * @public
 */
export interface TLHandle {
	/** A unique identifier for the handle. */
	id: string
	type: TLHandleType
	canBind?: boolean
	index: string
	x: number
	y: number
}
/** @public */
export const handleTypeValidator: T.Validator<TLHandle> = T.object({
	id: T.string,
	type: T.setEnum(TL_HANDLE_TYPES),
	canBind: T.boolean.optional(),
	index: T.string,
	x: T.number,
	y: T.number,
})

/**
 * A base interface for a shape's handles.
 *
 * @public
 */
export interface TLHandlePartial {
	/** A unique identifier for the handle. */
	// id: string
	// index: string
	x: number
	y: number
}
