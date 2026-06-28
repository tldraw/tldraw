import { Vec, strokeOutlineFromPointsWasm } from '@tldraw/editor'
import type { StrokeOptions, StrokePoint } from './types'

/**
 * ## getStrokeOutlinePoints
 *
 * Get an array of points (as `[x, y]`) representing the outline of a stroke.
 *
 * @param points - An array of StrokePoints as returned from `getStrokePoints`.
 * @param options - An object with options.
 * @public
 */
export function getStrokeOutlinePoints(
	strokePoints: StrokePoint[],
	options: StrokeOptions = {}
): Vec[] {
	const data = strokeOutlineFromPointsWasm(strokePoints, options) ?? new Float64Array(0)
	const n = data.length / 2
	const out: Vec[] = new Array(n)
	for (let i = 0; i < n; i++) out[i] = new Vec(data[i * 2], data[i * 2 + 1])
	return out
}
