import { CubicBezier2d, CubicSpline2d, Edge2d, Polyline2d } from '@tldraw/editor'

export function getSvgPathForEdge(edge: Edge2d, first: boolean) {
	const { start, end } = edge
	if (first) {
		return `M${start.x},${start.y} L${end.x},${end.y} `
	}
	return `${end.x},${end.y} `
}

export function getSvgPathForBezierCurve(curve: CubicBezier2d, first: boolean) {
	const { a, b, c, d } = curve
	if (first) {
		return `M${a.x},${a.y} C${b.x},${b.y} ${c.x},${c.y} ${d.x},${d.y} `
	}
	return `${b.x},${b.y} ${c.x},${c.y} ${d.x},${d.y} `
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
