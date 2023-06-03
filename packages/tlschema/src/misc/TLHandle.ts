import { T } from '@tldraw/validate'
import { SetValue } from '../util-types'

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
