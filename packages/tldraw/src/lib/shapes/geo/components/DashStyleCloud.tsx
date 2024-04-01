import { TLGeoShape, TLShapeId, Vec, canonicalizeRotation } from '@tldraw/editor'
import * as React from 'react'
import { ShapeFill, useDefaultColorTheme } from '../../shared/ShapeFill'
import { getPerfectDashProps } from '../../shared/getPerfectDashProps'
import { cloudSvgPath, getCloudArcs } from '../cloudOutline'

export const DashStyleCloud = React.memo(function DashStylePolygon({
	dash,
	fill,
	color,
	strokeWidth,
	w,
	h,
	id,
	size,
}: Pick<TLGeoShape['props'], 'dash' | 'fill' | 'color' | 'w' | 'h' | 'size'> & {
	strokeWidth: number
	id: TLShapeId
}) {
	const theme = useDefaultColorTheme()
	const innerPath = cloudSvgPath(w, h, id, size)
	const arcs = getCloudArcs(w, h, id, size)

	return (
		<>
			<ShapeFill theme={theme} d={innerPath} fill={fill} color={color} />
			<g strokeWidth={strokeWidth} stroke={theme[color].solid} fill="none" pointerEvents="all">
				{arcs.map(({ leftPoint, rightPoint, center, radius }, i) => {
					const arcLength = center
						? radius *
							canonicalizeRotation(
								canonicalizeRotation(Vec.Angle(center, rightPoint)) -
									canonicalizeRotation(Vec.Angle(center, leftPoint))
							)
						: Vec.Dist(leftPoint, rightPoint)

					const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
						arcLength,
						strokeWidth,
						{
							style: dash,
							start: 'outset',
							end: 'outset',
						}
					)

					return (
						<path
							key={i}
							d={
								center
									? `M${leftPoint.x},${leftPoint.y}A${radius},${radius},0,0,1,${rightPoint.x},${rightPoint.y}`
									: `M${leftPoint.x},${leftPoint.y}L${rightPoint.x},${rightPoint.y}`
							}
							strokeDasharray={strokeDasharray}
							strokeDashoffset={strokeDashoffset}
						/>
					)
				})}
			</g>
		</>
	)
})
