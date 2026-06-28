import { Vec, VecLike } from '@tldraw/editor'
import type { StrokeOptions } from '../types'
import { computeRadii, ingest, loadSrcFromPipeline, pointCount } from './core'
import { outlineFromSrc } from './getStrokeOutlinePoints'

// JS reference implementation of getStroke, kept only as a test oracle for the WASM port
// (see ../freehand.wasm.arrays.parity.test.ts). Not part of the shipped SDK.
export function getStroke(points: VecLike[], options: StrokeOptions = {}): Vec[] {
	ingest(points, options)
	if (pointCount === 0) return []
	computeRadii(options)
	loadSrcFromPipeline()
	return outlineFromSrc(options)
}
