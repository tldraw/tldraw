import { Vec, VecLike, strokeOutlineWasm } from '@tldraw/editor'
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
export function getStroke(points: VecLike[], options: StrokeOptions = {}): Vec[] {
	const data = strokeOutlineWasm(points, options) ?? new Float64Array(0)
	const n = data.length / 2
	const out: Vec[] = new Array(n)
	for (let i = 0; i < n; i++) out[i] = new Vec(data[i * 2], data[i * 2 + 1])
	return out
}
