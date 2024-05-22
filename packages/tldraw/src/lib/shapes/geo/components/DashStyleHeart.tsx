import { TLGeoShape, TLShapeId } from '@tldraw/editor'
import * as React from 'react'
import { ShapeFill, useDefaultColorTheme } from '../../shared/ShapeFill'
import { getPerfectDashProps } from '../../shared/getPerfectDashProps'
import { getHeartParts, getHeartPath } from '../geo-shape-helpers'

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
	const curves = getHeartParts(w, h)

	return (
		<>
			<ShapeFill theme={theme} d={d} color={color} fill={fill} />
			{curves.map((c, i) => {
				const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(c.length, sw, {
					style: dash,
					snap: 1,
					start: 'outset',
					end: 'outset',
					closed: true,
				})
				return (
					<path
						key={`curve_${i}`}
						d={c.toSvg()}
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
