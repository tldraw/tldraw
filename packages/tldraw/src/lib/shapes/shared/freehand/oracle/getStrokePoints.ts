import { Vec, VecLike } from '@tldraw/editor'
import type { StrokeOptions, StrokePoint } from '../types'
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

// JS reference implementation of getStrokePoints, kept only as a test oracle for the WASM
// port. Not part of the shipped SDK.
export function getStrokePoints(
	rawInputPoints: VecLike[],
	options: StrokeOptions = {}
): StrokePoint[] {
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
