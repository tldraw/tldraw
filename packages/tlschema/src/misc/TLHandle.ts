import {
	TypeValidator,
	booleanValidator,
	numberValidator,
	objectValidator,
	setEnumValidator,
	stringValidator,
} from '@tldraw/validate'
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
export const handleValidator: TypeValidator<TLHandle> = objectValidator({
	id: stringValidator,
	type: setEnumValidator(TL_HANDLE_TYPES),
	canBind: booleanValidator.optional(),
	index: stringValidator,
	x: numberValidator,
	y: numberValidator,
})
