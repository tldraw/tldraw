import { TLGeoShape, TLShapeId, toDomPrecision } from '@tldraw/editor'
import * as React from 'react'
import { ShapeFill, useDefaultColorTheme } from '../../shared/ShapeFill'
import { getPerfectDashProps } from '../../shared/getPerfectDashProps'
import { getHeartLength, getHeartPath } from './SolidStyleHeart'

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
	const perimeter = getHeartLength(w, h)

	const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(perimeter, sw, {
		style: dash,
		snap: 4,
		start: 'outset',
		end: 'outset',
		closed: true,
	})

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
