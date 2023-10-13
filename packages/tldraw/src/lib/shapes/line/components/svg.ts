import {
	CubicBezier2d,
	CubicSpline2d,
	Edge2d,
	Polyline2d,
	Vec2d,
	toDomPrecision,
} from '@tldraw/editor'

export function getSvgPathForEdge(edge: Edge2d, first: boolean) {
	const { start, end } = edge
	if (first) {
		return `M${toDomPrecision(start.x)},${toDomPrecision(start.y)} L${toDomPrecision(
			end.x
		)},${toDomPrecision(end.y)} `
	}
	return `${toDomPrecision(end.x)},${toDomPrecision(end.y)} `
}

export function getSvgPathForBezierCurve(curve: CubicBezier2d, first: boolean) {
	const { a, b, c, d } = curve

	if (Vec2d.Equals(a, d)) return ''

	return `${first ? `M${toDomPrecision(a.x)},${toDomPrecision(a.y)}` : ``}C${toDomPrecision(
		b.x
	)},${toDomPrecision(b.y)} ${toDomPrecision(c.x)},${toDomPrecision(c.y)} ${toDomPrecision(
		d.x
	)},${toDomPrecision(d.y)}`
}

export function getSvgPathForCubicSpline(spline: CubicSpline2d, isClosed: boolean) {
	let d = spline.segments.reduce((d, segment, i) => {
		return d + getSvgPathForBezierCurve(segment, i === 0)
	}, '')

	if (isClosed) {
		d += 'Z'
	}

	return d
}

export function getSvgPathForPolylineSpline(spline: Polyline2d, isClosed: boolean) {
	let d = spline.segments.reduce((d, segment, i) => {
		return d + getSvgPathForEdge(segment, i === 0)
	}, '')

	if (isClosed) {
		d += 'Z'
	}

	return d
}

export function getSvgPathForLineGeometry(spline: CubicSpline2d | Polyline2d, isClosed = false) {
	if (spline instanceof Polyline2d) {
		return getSvgPathForPolylineSpline(spline, isClosed)
	} else {
		return getSvgPathForCubicSpline(spline, isClosed)
	}
}
