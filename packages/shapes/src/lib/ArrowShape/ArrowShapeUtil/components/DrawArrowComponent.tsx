import { getSvgPathFromStroke } from '@tldraw/editor'
import { CubicSpline2d, getStroke, Polyline2d } from '@tldraw/primitives'
import { getDrawStrokeInfo } from '../../../shared/getDrawStrokeInfo'

export function DrawArrowComponent({
	strokeWidth,
	spline,
}: {
	strokeWidth: number
	spline: CubicSpline2d | Polyline2d
}) {
	const { segments } = spline
	const allPoints = segments.flatMap((segment) => segment.lut)
	const pf = getStroke(allPoints, getDrawStrokeInfo(strokeWidth))
	const pfPath = getSvgPathFromStroke(pf)

	return <path strokeWidth="0" stroke="none" fill="currentColor" d={pfPath} />
}

export function DrawArrowComponentSvg({
	strokeWidth,
	spline,
	color,
}: {
	strokeWidth: number
	spline: CubicSpline2d | Polyline2d
	color: string
}) {
	const { segments } = spline
	const allPoints = segments.flatMap((segment) => segment.lut)
	const pf = getStroke(allPoints, getDrawStrokeInfo(strokeWidth))
	const pfPath = getSvgPathFromStroke(pf)

	const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
	path.setAttribute('stroke-width', '0')
	path.setAttribute('stroke', 'none')
	path.setAttribute('fill', color)
	path.setAttribute('d', pfPath)

	return path
}
