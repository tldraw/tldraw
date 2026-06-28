import { VecLike, svgFromPointsWasm, svgInkWasm } from '@tldraw/editor'
import { StrokeOptions } from './types'

// Bridges the draw/highlight render paths to the Rust/WASM ink generators. The draw shape's
// own options always use supported settings (known easings, round caps, no taper), so these
// resolve through WASM; they degrade to an empty path only if the module can't instantiate.

/**
 * The draw shape's ink path (`dash: 'draw'`). WASM port of `svgInk`.
 */
export function getInkPath(rawInputPoints: VecLike[], options: StrokeOptions = {}): string {
	return svgInkWasm(rawInputPoints, options) ?? ''
}

/**
 * The centerline (solid / fill) path used by draw and highlight rendering — the WASM port of
 * `getSvgPathFromStrokePoints(getStrokePoints(points, options), closed)`.
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
	return null
}
