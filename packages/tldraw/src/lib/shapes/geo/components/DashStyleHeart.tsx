import { CubicBezier2d, TLGeoShape, TLShapeId } from '@tldraw/editor'
import * as React from 'react'
import { ShapeFill, useDefaultColorTheme } from '../../shared/ShapeFill'
import { getPerfectDashProps } from '../../shared/getPerfectDashProps'
import { getHeartCurves, getHeartPath } from './SolidStyleHeart'

export const DashStyleHeart = React.memo(function DashStyleHeart({
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
	const d = getHeartPath(w, h)
	const curves = getHeartCurves(w, h)

	return (
		<>
			<ShapeFill theme={theme} d={d} color={color} fill={fill} />
			{curves.map((c, i) => {
				const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
					CubicBezier2d.GetLength(c),
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
					<path
						key={`curve_${i}`}
						d={CubicBezier2d.GetSvgPath(c)}
						strokeWidth={sw}
						fill="none"
						stroke={theme[color].solid}
						strokeDasharray={strokeDasharray}
						strokeDashoffset={strokeDashoffset}
						pointerEvents="all"
					/>
				)
			})}
		</>
	)
})
