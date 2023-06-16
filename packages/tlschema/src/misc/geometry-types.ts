import { T } from '@tldraw/validate'

/**
 * A serializable model for 2D boxes.
 *
 * @public */
export interface Box2dModel {
	x: number
	y: number
	w: number
	h: number
}

/**
 * A serializable model for 2D vectors.
 *
 * @public */
export interface Vec2dModel {
	x: number
	y: number
	z?: number
}

/** @public */
export const vec2dModelValidator: T.Validator<Vec2dModel> = T.object({
	x: T.number,
	y: T.number,
	z: T.number.optional(),
})

/** @public */
export const box2dModelValidator: T.Validator<Box2dModel> = T.object({
	x: T.number,
	y: T.number,
	w: T.number,
	h: T.number,
})
