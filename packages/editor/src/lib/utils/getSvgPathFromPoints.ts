import { VecLike } from '../primitives/Vec'
import { getSvgPathFromPointsWasm } from './freehand-wasm/svgInkWasm'

/**
 * Turn an array of points into a path of quadratic curves.
 *
 * @param points - The points returned from perfect-freehand
 * @param closed - Whether the stroke is closed
 *
 * @public
 */
export function getSvgPathFromPoints(points: VecLike[], closed = true): string {
	// Path generation is implemented in Rust/WASM (see freehand-wasm).
	return getSvgPathFromPointsWasm(points, closed) ?? ''
}
