import { Vec2d, VecLike } from '@tldraw/editor'
import { getStrokeOutlinePoints } from './getStrokeOutlinePoints'
import { getStrokePoints } from './getStrokePoints'
import { setStrokePointRadii } from './setStrokePointRadii'
import type { StrokeOptions } from './types'

/**
 * ## getStroke
 *
 * Get an array of points describing a polygon that surrounds the input points.
 *
 * @param points - An array of points (as `[x, y, pressure]` or `{x, y, pressure}`). Pressure is
 *   optional in both cases.
 * @param options - An object with options.
 * @public
 */

export function getStroke(points: VecLike[], options: StrokeOptions = {}): Vec2d[] {
	return getStrokeOutlinePoints(
		setStrokePointRadii(getStrokePoints(points, options), options),
		options
	)
}
