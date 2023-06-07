import { perimeterOfEllipse, toDomPrecision } from '@tldraw/primitives'
import { TLShapeId } from '@tldraw/tlschema'
import * as React from 'react'
import { ShapeFill, getShapeFillSvg, getSvgWithShapeFill } from '../../../shared/ShapeFill'
import { TLExportColors } from '../../../shared/TLExportColors'
import { getPerfectDashProps } from '../../../shared/getPerfectDashProps'
import { TLGeoShape } from '../../geoShapeTypes'

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

	return (
		<>
			<ShapeFill d={d} color={color} fill={fill} />
			<path
				d={d}
				strokeWidth={sw}
				width={toDomPrecision(w)}
				height={toDomPrecision(h)}
				fill="none"
				stroke="currentColor"
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
	colors,
	fill,
}: Pick<TLGeoShape['props'], 'w' | 'h' | 'dash' | 'color' | 'fill'> & {
	strokeWidth: number
	id: TLShapeId
	colors: TLExportColors
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
	strokeElement.setAttribute('stroke', colors.fill[color])
	strokeElement.setAttribute('stroke-dasharray', strokeDasharray)
	strokeElement.setAttribute('stroke-dashoffset', strokeDashoffset)

	// Get the fill element, if any
	const fillElement = getShapeFillSvg({
		d,
		fill,
		color,
		colors,
	})

	return getSvgWithShapeFill(strokeElement, fillElement)
}
