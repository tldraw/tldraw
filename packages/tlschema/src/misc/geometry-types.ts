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

/** @public */
export const vecModelValidator: T.Validator<VecModel> = T.object({
	x: T.number,
	y: T.number,
	z: T.number.optional(),
})

/** @public */
export const boxModelValidator: T.Validator<BoxModel> = T.object({
	x: T.number,
	y: T.number,
	w: T.number,
	h: T.number,
})
