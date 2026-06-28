import { Vec, VecLike, strokePointsWasm } from '@tldraw/editor'
import type { StrokeOptions, StrokePoint } from './types'

/**
 * ## getStrokePoints
 *
 * Get an array of points as objects with an adjusted point, pressure, vector, distance, and
 * runningLength.
 *
 * @param points - An array of points (as `[x, y, pressure]` or `{x, y, pressure}`). Pressure is
 *   optional in both cases.
 * @param options - An object with options.
 * @public
 */
export function getStrokePoints(
	rawInputPoints: VecLike[],
	options: StrokeOptions = {}
): StrokePoint[] {
	const data = strokePointsWasm(rawInputPoints, options) ?? new Float64Array(0)
	const count = data.length / 8
	const strokePoints: StrokePoint[] = new Array(count)
	for (let i = 0; i < count; i++) {
		const b = i * 8
		strokePoints[i] = {
			// point.z and input.z are both the clamped input z.
			point: new Vec(data[b], data[b + 1], data[b + 4]),
			input: new Vec(data[b + 2], data[b + 3], data[b + 4]),
			pressure: data[b + 5],
			distance: data[b + 6],
			runningLength: data[b + 7],
			radius: 1,
		}
	}
	return strokePoints
}
