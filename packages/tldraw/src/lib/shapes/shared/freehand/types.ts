import { Vec2d } from '@tldraw/editor'

/**
 * The options object for `getStroke` or `getStrokePoints`.
 *
 * @public
 */
export interface StrokeOptions {
	/** The base size (diameter) of the stroke. */
	size?: number
	/** The effect of pressure on the stroke's size. */
	thinning?: number
	/** How much to soften the stroke's edges. */
	smoothing?: number
	streamline?: number
	/** An easing function to apply to each point's pressure. */
	easing?: (pressure: number) => number
	/** Whether to simulate pressure based on velocity. */
	simulatePressure?: boolean
	/** Cap, taper and easing for the start of the line. */
	start?: {
		cap?: boolean
		taper?: number | boolean
		easing?: (distance: number) => number
	}
	/** Cap, taper and easing for the end of the line. */
	end?: {
		cap?: boolean
		taper?: number | boolean
		easing?: (distance: number) => number
	}
	/** Whether to handle the points as a completed stroke. */
	last?: boolean
}

/**
 * The points returned by `getStrokePoints`, and the input for `getStrokeOutlinePoints`
 *
 * @public
 */
export interface StrokePoint {
	point: Vec2d
	input: Vec2d
	vector: Vec2d
	pressure: number
	distance: number
	runningLength: number
	radius: number
}
