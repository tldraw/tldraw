import { Vec, VecLike, strokePointsWasm } from '@tldraw/editor'
import {
	distances,
	ingest,
	inputX,
	inputY,
	inputZ,
	pointCount,
	pointX,
	pointY,
	pressures,
	runningLengths,
} from './core'
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
	const data = strokePointsWasm(rawInputPoints, options)
	if (data) {
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

	// Fallback for environments that can't instantiate the WASM module.
	ingest(rawInputPoints, options)

	const n = pointCount
	const ptX = pointX
	const ptY = pointY
	const inX = inputX
	const inY = inputY
	const inZ = inputZ
	const press = pressures
	const dists = distances
	const runs = runningLengths
	const strokePoints: StrokePoint[] = new Array(n)
	for (let i = 0; i < n; i++) {
		const input = new Vec(inX[i], inY[i], inZ[i])
		// The first point needs no adjustment, so its point and input are the same vector.
		const point = i === 0 ? input : new Vec(ptX[i], ptY[i], inZ[i])
		strokePoints[i] = {
			point,
			input,
			pressure: press[i],
			distance: dists[i],
			runningLength: runs[i],
			radius: 1,
		}
	}
	return strokePoints
}
