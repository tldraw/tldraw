import { Vec, VecLike, strokeOutlineWasm } from '@tldraw/editor'
import { computeRadii, ingest, loadSrcFromPipeline, pointCount } from './core'
import { outlineFromSrc } from './getStrokeOutlinePoints'
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
	const data = strokeOutlineWasm(points, options)
	if (data) {
		const n = data.length / 2
		const out: Vec[] = new Array(n)
		for (let i = 0; i < n; i++) out[i] = new Vec(data[i * 2], data[i * 2 + 1])
		return out
	}

	// Fallback for environments that can't instantiate the WASM module.
	ingest(points, options)
	if (pointCount === 0) return []
	computeRadii(options)
	loadSrcFromPipeline()
	return outlineFromSrc(options)
}
