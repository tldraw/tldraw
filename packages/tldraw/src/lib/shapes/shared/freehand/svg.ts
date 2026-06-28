import { svgPathFromStrokePointsWasm } from '@tldraw/editor'
import { StrokePoint } from './types'

/**
 * Turn an array of stroke points into a path of quadratic curves.
 *
 * The path uses relative commands with coordinates rounded to hundredths of a pixel, which
 * renders identically to the absolute 4-decimal form but is much smaller and faster to build.
 *
 * @param points - The stroke points returned from perfect-freehand
 * @param closed - Whether the shape is closed
 *
 * @public
 */
export function getSvgPathFromStrokePoints(points: StrokePoint[], closed = false): string {
	return (
		svgPathFromStrokePointsWasm(
			points.map((p) => p.point),
			closed
		) ?? ''
	)
}
