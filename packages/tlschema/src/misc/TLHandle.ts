import { TypeValidator, boolean, number, object, setEnum, string } from '@tldraw/validate'
import { SetValue } from '../util-types'

/**
 * The handle types used by tldraw's default shapes.
 *
 * @public */
export const TL_HANDLE_TYPES = new Set(['vertex', 'virtual', 'create'] as const)

/**
 * A type for the handle types used by tldraw's default shapes.
 *
 * @public */
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

/** @internal */
export const handleValidator: TypeValidator<TLHandle> = object({
	id: string,
	type: setEnum(TL_HANDLE_TYPES),
	canBind: boolean.optional(),
	index: string,
	x: number,
	y: number,
})
