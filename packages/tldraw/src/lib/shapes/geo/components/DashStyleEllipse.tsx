import {
	TLDefaultColorTheme,
	TLGeoShape,
	TLShapeId,
	perimeterOfEllipse,
	toDomPrecision,
} from '@tldraw/editor'
import * as React from 'react'
import {
	ShapeFill,
	getShapeFillSvg,
	getSvgWithShapeFill,
	useDefaultColorTheme,
} from '../../shared/ShapeFill'
import { getPerfectDashProps } from '../../shared/getPerfectDashProps'

export const DashStyleEllipse = React.memo(function DashStyleEllipse({
	w,
	h,
	strokeWidth: sw,
	dash,
	color,
	fill,
}: Pick<TLGeoShape['props'], 'w' | 'h' | 'dash' | 'color' | 'fill'> & {
	strokeWidth: number
	id: TLShapeId
}) {
	const theme = useDefaultColorTheme()
	const cx = w / 2
	const cy = h / 2
	const rx = Math.max(0, cx)
	const ry = Math.max(0, cy)

	const perimeter = perimeterOfEllipse(rx, ry)

	const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
		perimeter < 64 ? perimeter * 2 : perimeter,
		sw,
		{
			style: dash,
			snap: 4,
			closed: true,
		}
	)

	const d = `M${cx - rx},${cy}a${rx},${ry},0,1,1,${rx * 2},0a${rx},${ry},0,1,1,-${rx * 2},0`

	return (
		<>
			<ShapeFill theme={theme} d={d} color={color} fill={fill} />
			<path
				d={d}
				strokeWidth={sw}
				width={toDomPrecision(w)}
				height={toDomPrecision(h)}
				fill="none"
				stroke={theme[color].solid}
				strokeDasharray={strokeDasharray}
				strokeDashoffset={strokeDashoffset}
				pointerEvents="all"
			/>
		</>
	)
})

export function DashStyleEllipseSvg({
	w,
	h,
	strokeWidth: sw,
	dash,
	color,
	theme,
	fill,
}: Pick<TLGeoShape['props'], 'w' | 'h' | 'dash' | 'color' | 'fill'> & {
	strokeWidth: number
	id: TLShapeId
	theme: TLDefaultColorTheme
}) {
	const cx = w / 2
	const cy = h / 2
	const rx = Math.max(0, cx - sw / 2)
	const ry = Math.max(0, cy - sw / 2)

	const perimeter = perimeterOfEllipse(rx, ry)

	const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
		perimeter < 64 ? perimeter * 2 : perimeter,
		sw,
		{
			style: dash,
			snap: 4,
			closed: true,
		}
	)

	const d = `M${cx - rx},${cy}a${rx},${ry},0,1,1,${rx * 2},0a${rx},${ry},0,1,1,-${rx * 2},0`

	const strokeElement = document.createElementNS('http://www.w3.org/2000/svg', 'path')
	strokeElement.setAttribute('d', d)
	strokeElement.setAttribute('stroke-width', sw.toString())
	strokeElement.setAttribute('width', w.toString())
	strokeElement.setAttribute('height', h.toString())
	strokeElement.setAttribute('fill', 'none')
	strokeElement.setAttribute('stroke', theme[color].solid)
	strokeElement.setAttribute('stroke-dasharray', strokeDasharray)
	strokeElement.setAttribute('stroke-dashoffset', strokeDashoffset)

	// Get the fill element, if any
	const fillElement = getShapeFillSvg({
		d,
		fill,
		color,
		theme,
	})

	return getSvgWithShapeFill(strokeElement, fillElement)
}
