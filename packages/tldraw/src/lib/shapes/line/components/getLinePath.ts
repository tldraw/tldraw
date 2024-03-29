import { CubicSpline2d, Polyline2d, TLLineShape, getSvgPathFromPoints } from '@tldraw/editor'
import { getStrokeOutlinePoints } from '../../shared/freehand/getStrokeOutlinePoints'
import { getStrokePoints } from '../../shared/freehand/getStrokePoints'
import { setStrokePointRadii } from '../../shared/freehand/setStrokePointRadii'
import { getSvgPathFromStrokePoints } from '../../shared/freehand/svg'
import { getSvgPathForLineGeometry } from './svg'

function getLineDrawFreehandOptions(strokeWidth: number) {
	return {
		size: strokeWidth,
		thinning: 0.4,
		streamline: 0,
		smoothing: 0.5,
		simulatePressure: true,
		last: true,
	}
}

function getLineStrokePoints(
	shape: TLLineShape,
	spline: CubicSpline2d | Polyline2d,
	strokeWidth: number
) {
	// const points = getLinePoints(spline)
	const points = spline.vertices
	const options = getLineDrawFreehandOptions(strokeWidth)
	return getStrokePoints(points, options)
}

function getLineDrawStrokeOutlinePoints(
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

export function getLineDrawPath(
	shape: TLLineShape,
	spline: CubicSpline2d | Polyline2d,
	strokeWidth: number
) {
	const stroke = getLineDrawStrokeOutlinePoints(shape, spline, strokeWidth)
	return getSvgPathFromPoints(stroke)
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
