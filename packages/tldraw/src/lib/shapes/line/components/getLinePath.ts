import { CubicSpline2d, Polyline2d, TLLineShape, getSvgPathFromPoints } from '@tldraw/editor'
import { getStrokeOutlinePoints } from '../../shared/freehand/getStrokeOutlinePoints'
import { getStrokePoints } from '../../shared/freehand/getStrokePoints'
import { setStrokePointRadii } from '../../shared/freehand/setStrokePointRadii'
import { getSvgPathFromStrokePoints } from '../../shared/freehand/svg'
import { getSvgPathForLineGeometry } from './svg'

// function getLinePoints(spline: CubicSpline2d | Polyline2d) {
// 	const { segments } = spline

// 	const allPoints: Vec2d[] = []

// 	for (let j = 0, k = segments.length; j < k; j++) {
// 		const segment = segments[j]
// 		const lut = segment.vertices

// 		const n = lut.length - 1

// 		if (j > 0) {
// 			allPoints.push(Vec2d.Lrp(lut[0], lut[1], 0.25))
// 		} else {
// 			allPoints.push(lut[0])
// 		}

// 		for (let i = 1; i < n; i++) {
// 			allPoints.push(lut[i])
// 		}

// 		if (j < k - 1) {
// 			allPoints.push(Vec2d.Lrp(lut[n - 1], lut[n], 0.75))
// 		} else {
// 			allPoints.push(lut[n])
// 		}
// 	}

// 	return allPoints
// }

export function getLineDrawFreehandOptions(strokeWidth: number) {
	return {
		size: strokeWidth,
		thinning: 0.4,
		streamline: 0,
		smoothing: 0.5,
		simulatePressure: true,
		last: true,
	}
}

export function getLineSolidFreehandOptions(strokeWidth: number) {
	return {
		size: strokeWidth,
		thinning: 0,
		streamline: 0,
		smoothing: 0.5,
		simulatePressure: false,
		last: true,
	}
}

export function getLineStrokePoints(
	shape: TLLineShape,
	spline: CubicSpline2d | Polyline2d,
	strokeWidth: number
) {
	// const points = getLinePoints(spline)
	const points = spline.vertices
	const options = getLineDrawFreehandOptions(strokeWidth)
	return getStrokePoints(points, options)
}

export function getLineDrawStrokeOutlinePoints(
	shape: TLLineShape,
	spline: CubicSpline2d | Polyline2d,
	strokeWidth: number
) {
	const options = getLineDrawFreehandOptions(strokeWidth)
	return getStrokeOutlinePoints(
		setStrokePointRadii(getLineStrokePoints(shape, spline, strokeWidth), options),
		options
	)
}

export function getLineSolidStrokeOutlinePoints(
	shape: TLLineShape,
	spline: CubicSpline2d | Polyline2d,
	strokeWidth: number
) {
	const options = getLineSolidFreehandOptions(strokeWidth)
	return getStrokeOutlinePoints(getLineStrokePoints(shape, spline, strokeWidth), options)
}

export function getLineDrawPath(
	shape: TLLineShape,
	spline: CubicSpline2d | Polyline2d,
	strokeWidth: number
) {
	const stroke = getLineDrawStrokeOutlinePoints(shape, spline, strokeWidth)
	return getSvgPathFromPoints(stroke)
}

export function getLineSolidPath(
	shape: TLLineShape,
	spline: CubicSpline2d | Polyline2d,
	strokeWidth: number
) {
	const outlinePoints = getLineSolidStrokeOutlinePoints(shape, spline, strokeWidth)
	return getSvgPathFromPoints(outlinePoints)
}

export function getLineIndicatorPath(
	shape: TLLineShape,
	spline: CubicSpline2d | Polyline2d,
	strokeWidth: number
) {
	if (shape.props.dash === 'draw') {
		const strokePoints = getLineStrokePoints(shape, spline, strokeWidth)
		return getSvgPathFromStrokePoints(strokePoints)
	}

	return getSvgPathForLineGeometry(spline)
}
