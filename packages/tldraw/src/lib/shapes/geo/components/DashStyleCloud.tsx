import { TLDefaultColorTheme, TLGeoShape, TLShapeId } from '@tldraw/editor'
import { Vec2d, canonicalizeRotation } from '@tldraw/primitives'
import * as React from 'react'
import {
	ShapeFill,
	getShapeFillSvg,
	getSvgWithShapeFill,
	useDefaultColorTheme,
} from '../../shared/ShapeFill'
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
			<ShapeFill d={innerPath} fill={fill} color={color} />
			<g strokeWidth={strokeWidth} stroke={theme[color].solid} fill="none" pointerEvents="all">
				{arcs.map(({ leftPoint, rightPoint, center, radius }, i) => {
					const angle = canonicalizeRotation(
						canonicalizeRotation(Vec2d.Angle(center, rightPoint)) -
							canonicalizeRotation(Vec2d.Angle(center, leftPoint))
					)
					const arcLength = radius * angle

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
							d={`M${leftPoint.x},${leftPoint.y}A${radius},${radius},0,0,1,${rightPoint.x},${rightPoint.y}`}
							strokeDasharray={strokeDasharray}
							strokeDashoffset={strokeDashoffset}
						/>
					)
				})}
			</g>
		</>
	)
})

export function DashStyleCloudSvg({
	dash,
	fill,
	color,
	theme,
	strokeWidth,
	w,
	h,
	id,
	size,
}: Pick<TLGeoShape['props'], 'dash' | 'fill' | 'color' | 'w' | 'h' | 'size'> & {
	id: TLShapeId
	strokeWidth: number
	theme: TLDefaultColorTheme
}) {
	const innerPath = cloudSvgPath(w, h, id, size)
	const arcs = getCloudArcs(w, h, id, size)

	const strokeElement = document.createElementNS('http://www.w3.org/2000/svg', 'g')
	strokeElement.setAttribute('stroke-width', strokeWidth.toString())
	strokeElement.setAttribute('stroke', theme[color].solid)
	strokeElement.setAttribute('fill', 'none')

	for (const { leftPoint, rightPoint, center, radius } of arcs) {
		const angle = canonicalizeRotation(
			canonicalizeRotation(Vec2d.Angle(center, rightPoint)) -
				canonicalizeRotation(Vec2d.Angle(center, leftPoint))
		)
		const arcLength = radius * angle

		const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(arcLength, strokeWidth, {
			style: dash,
			start: 'outset',
			end: 'outset',
		})

		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
		path.setAttribute(
			'd',
			`M${leftPoint.x},${leftPoint.y}A${radius},${radius},0,0,1,${rightPoint.x},${rightPoint.y}`
		)
		path.setAttribute('stroke-dasharray', strokeDasharray.toString())
		path.setAttribute('stroke-dashoffset', strokeDashoffset.toString())
		strokeElement.appendChild(path)
	}

	// Get the fill element, if any
	const fillElement = getShapeFillSvg({
		d: innerPath,
		fill,
		color,
		theme,
	})

	return getSvgWithShapeFill(strokeElement, fillElement)
}
