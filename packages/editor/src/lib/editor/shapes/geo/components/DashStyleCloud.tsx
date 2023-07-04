import { Vec2d, VecLike, canonicalizeRotation } from '@tldraw/primitives'
import { TLDefaultColorTheme, TLGeoShape, TLShapeId } from '@tldraw/tlschema'
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

export function DashStylePolygonSvg({
	dash,
	fill,
	color,
	theme,
	strokeWidth,
	outline,
	lines,
}: Pick<TLGeoShape['props'], 'dash' | 'fill' | 'color'> & {
	outline: VecLike[]
	strokeWidth: number
	theme: TLDefaultColorTheme
	lines?: VecLike[][]
}) {
	const strokeElement = document.createElementNS('http://www.w3.org/2000/svg', 'g')
	strokeElement.setAttribute('stroke-width', strokeWidth.toString())
	strokeElement.setAttribute('stroke', theme[color].solid)
	strokeElement.setAttribute('fill', 'none')

	Array.from(Array(outline.length)).forEach((_, i) => {
		const A = outline[i]
		const B = outline[(i + 1) % outline.length]

		const dist = Vec2d.Dist(A, B)
		const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(dist, strokeWidth, {
			style: dash,
		})

		const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
		line.setAttribute('x1', A.x.toString())
		line.setAttribute('y1', A.y.toString())
		line.setAttribute('x2', B.x.toString())
		line.setAttribute('y2', B.y.toString())
		line.setAttribute('stroke-dasharray', strokeDasharray.toString())
		line.setAttribute('stroke-dashoffset', strokeDashoffset.toString())

		strokeElement.appendChild(line)
	})

	if (lines) {
		for (const [A, B] of lines) {
			const dist = Vec2d.Dist(A, B)
			const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(dist, strokeWidth, {
				style: dash,
				start: 'skip',
				end: 'skip',
				snap: dash === 'dotted' ? 4 : 2,
			})

			const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
			line.setAttribute('x1', A.x.toString())
			line.setAttribute('y1', A.y.toString())
			line.setAttribute('x2', B.x.toString())
			line.setAttribute('y2', B.y.toString())
			line.setAttribute('stroke-dasharray', strokeDasharray.toString())
			line.setAttribute('stroke-dashoffset', strokeDashoffset.toString())

			strokeElement.appendChild(line)
		}
	}

	// Get the fill element, if any
	const fillElement = getShapeFillSvg({
		d: 'M' + outline[0] + 'L' + outline.slice(1) + 'Z',
		fill,
		color,
		theme,
	})

	return getSvgWithShapeFill(strokeElement, fillElement)
}
