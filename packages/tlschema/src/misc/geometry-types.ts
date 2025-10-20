import { T } from '@tldraw/validate'

/**
 * A serializable model for 2D boxes.
 *
 * @public */
export interface BoxModel {
	x: number
	y: number
	w: number
	h: number
}

/**
 * A serializable model for 2D vectors.
 *
 * @public */
export interface VecModel {
	x: number
	y: number
	z?: number
}

/**
 * Validator for VecModel objects that ensures they have numeric x and y coordinates,
 * with an optional z coordinate for 3D vectors. Used throughout the schema to
 * validate point and vector data structures.
 *
 * @public
 * @example
 * ```ts
 * const vector2D = { x: 10, y: 20 }
 * const isValid = vecModelValidator.check(vector2D) // true
 *
 * const vector3D = { x: 10, y: 20, z: 30 }
 * const isValid3D = vecModelValidator.check(vector3D) // true
 * ```
 */
export const vecModelValidator: T.ObjectValidator<VecModel> = T.object({
	x: T.number,
	y: T.number,
	z: T.number.optional(),
})

/**
 * Validator for BoxModel objects that ensures they have numeric x, y coordinates
 * for position and w, h values for width and height. Used throughout the schema
 * to validate bounding box and rectangular area data structures.
 *
 * @public
 * @example
 * ```ts
 * const box = { x: 10, y: 20, w: 100, h: 50 }
 * const isValid = boxModelValidator.check(box) // true
 *
 * const invalidBox = { x: 10, y: 20, w: -5, h: 50 }
 * const isValidNegative = boxModelValidator.check(invalidBox) // true (validator allows negative values)
 * ```
 */
export const boxModelValidator: T.ObjectValidator<BoxModel> = T.object({
	x: T.number,
	y: T.number,
	w: T.number,
	h: T.number,
})
