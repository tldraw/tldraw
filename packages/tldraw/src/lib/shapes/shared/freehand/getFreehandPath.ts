import { VecLike, svgFromPointsWasm, svgInkWasm } from '@tldraw/editor'
import { getStrokePoints } from './getStrokePoints'
import { getSvgPathFromStrokePoints } from './svg'
import { svgInk } from './svgInk'
import { StrokeOptions } from './types'

// Bridges the Rust/WASM ink generators with the JS implementations. Each helper tries the
// WASM port and transparently falls back to JS when the options aren't supported (taper,
// flat caps, custom easing) or the module can't run. The WASM output is byte-for-byte
// identical to JS for supported options (see wasm/svgInkWasm.parity.test.ts), so these are
// drop-in replacements for the direct freehand calls.

/**
 * The draw shape's ink path (`dash: 'draw'`). WASM port of `svgInk` with a JS fallback.
 */
export function getInkPath(rawInputPoints: VecLike[], options: StrokeOptions = {}): string {
	return svgInkWasm(rawInputPoints, options) ?? svgInk(rawInputPoints, options)
}

/**
 * The centerline (solid / fill) path used by draw and highlight rendering — the WASM port of
 * `getSvgPathFromStrokePoints(getStrokePoints(points, options), closed)` with a JS fallback.
 *
 * Returns `null` when the stroke is too short to form a path (fewer than two streamlined
 * points), so the caller can draw its own dot — matching the existing `strokePoints.length`
 * guard at each call site.
 */
export function getCenterlinePath(
	rawInputPoints: VecLike[],
	options: StrokeOptions = {},
	closed = false
): string | null {
	const fast = svgFromPointsWasm(rawInputPoints, options, closed)
	if (fast) return fast.pointCount > 1 ? fast.path : null
	const strokePoints = getStrokePoints(rawInputPoints, options)
	return strokePoints.length > 1 ? getSvgPathFromStrokePoints(strokePoints, closed) : null
}
