import { TLDefaultDashStyle, TLLineShape } from '@tldraw/tlschema'
import { CubicSpline2d, Polyline2d } from '../../../editor'
import { getPerfectDashProps } from '../../shared/getPerfectDashProps'
import { getLineDrawPath } from './getLinePath'
import { getSvgPathForBezierCurve, getSvgPathForEdge, getSvgPathForLineGeometry } from './svg'

export function getDrawLineShapeSvg({
	shape,
	strokeWidth,
	spline,
	color,
}: {
	shape: TLLineShape
	strokeWidth: number
	spline: CubicSpline2d | Polyline2d
	color: string
}) {
	const pfPath = getLineDrawPath(shape, spline, strokeWidth)

	const p = document.createElementNS('http://www.w3.org/2000/svg', 'path')
	p.setAttribute('stroke-width', '0')
	p.setAttribute('stroke', 'none')
	p.setAttribute('fill', color)
	p.setAttribute('d', pfPath)

	return p
}

export function getDashedLineShapeSvg({
	dash,
	strokeWidth,
	spline,
	color,
}: {
	dash: TLDefaultDashStyle
	strokeWidth: number
	spline: CubicSpline2d | Polyline2d
	color: string
}) {
	const { segments } = spline

	const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
	g.setAttribute('stroke', color)
	g.setAttribute('stroke-width', strokeWidth.toString())

	const fn = spline instanceof CubicSpline2d ? getSvgPathForBezierCurve : getSvgPathForEdge

	segments.forEach((segment, i) => {
		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
		const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(segment.length, strokeWidth, {
			style: dash,
			start: i > 0 ? 'outset' : 'none',
			end: i < segments.length - 1 ? 'outset' : 'none',
		})

		path.setAttribute('stroke-dasharray', strokeDasharray.toString())
		path.setAttribute('stroke-dashoffset', strokeDashoffset.toString())
		path.setAttribute('d', fn(segment as any, i === 0))
		path.setAttribute('fill', 'none')
		g.appendChild(path)
	})

	return g
}

export function getSolidLineShapeSvg({
	strokeWidth,
	spline,
	color,
}: {
	strokeWidth: number
	spline: CubicSpline2d | Polyline2d
	color: string
}) {
	const path = getSvgPathForLineGeometry(spline)

	const p = document.createElementNS('http://www.w3.org/2000/svg', 'path')
	p.setAttribute('stroke-width', strokeWidth.toString())
	p.setAttribute('stroke', color)
	p.setAttribute('fill', 'none')
	p.setAttribute('d', path)

	return p
}

export function getLineSvg(
	shape: TLLineShape,
	spline: CubicSpline2d | Polyline2d,
	color: string,
	strokeWidth: number
) {
	switch (shape.props.dash) {
		case 'draw':
			return getDrawLineShapeSvg({
				shape,
				strokeWidth,
				spline,
				color,
			})

		case 'solid':
			return getSolidLineShapeSvg({
				strokeWidth,
				spline,
				color,
			})
		default:
			return getDashedLineShapeSvg({
				strokeWidth,
				spline,
				dash: shape.props.dash,
				color,
			})
	}
}
