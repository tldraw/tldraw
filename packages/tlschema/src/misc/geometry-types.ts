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
	/** Pressure value from 0-100. Only present when pressure input is available. */
	z?: number
}

/** @public */
export const vecModelValidator: T.ObjectValidator<VecModel> = T.object({
	x: T.number,
	y: T.number,
	z: T.integer.check((val) => val >= 0 && val <= 100).optional(),
})

/** @public */
export const boxModelValidator: T.ObjectValidator<BoxModel> = T.object({
	x: T.number,
	y: T.number,
	w: T.number,
	h: T.number,
})
