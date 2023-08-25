import { CubicBezier2d, CubicSpline2d, Edge2d, Polyline2d, Vec2d } from '@tldraw/editor'

export function getSvgPathForEdge(edge: Edge2d, first: boolean) {
	const { start, end } = edge
	if (first) {
		return `M${start.x},${start.y} L${end.x},${end.y} `
	}
	return `${end.x},${end.y} `
}

export function getSvgPathForBezierCurve(curve: CubicBezier2d, first: boolean) {
	const { a, b, c, d } = curve

	if (Vec2d.Equals(a, d)) return ''

	return `${first ? `M${a.x.toFixed(2)},${a.y.toFixed(2)}` : ``}C${b.x.toFixed(2)},${b.y.toFixed(
		2
	)} ${c.x.toFixed(2)},${c.y.toFixed(2)} ${d.x.toFixed(2)},${d.y.toFixed(2)}`
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
