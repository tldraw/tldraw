import { Stadium2d, TLGeoShape, TLShapeId } from '@tldraw/editor'
import * as React from 'react'
import { ShapeFill, useDefaultColorTheme } from '../../shared/ShapeFill'
import { getPerfectDashProps } from '../../shared/getPerfectDashProps'

export const DashStyleOval = React.memo(function DashStyleOval({
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
	const geometry = new Stadium2d({ width: w, height: h, isFilled: false })
	const d = geometry.getSvgPathData()
	const perimeter = geometry.getLength()

	const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
		perimeter < 64 ? perimeter * 2 : perimeter,
		sw,
		{
			style: dash,
			snap: 4,
			start: 'outset',
			end: 'outset',
			closed: true,
		}
	)

	return (
		<>
			<ShapeFill theme={theme} d={d} color={color} fill={fill} />
			<path
				d={d}
				strokeWidth={sw}
				fill="none"
				stroke={theme[color].solid}
				strokeDasharray={strokeDasharray}
				strokeDashoffset={strokeDashoffset}
			/>
		</>
	)
})
