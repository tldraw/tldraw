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
