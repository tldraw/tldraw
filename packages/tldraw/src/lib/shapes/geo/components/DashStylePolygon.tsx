import { TLDefaultColorTheme, TLGeoShape, Vec2d, VecLike } from '@tldraw/editor'
import * as React from 'react'
import {
	ShapeFill,
	getShapeFillSvg,
	getSvgWithShapeFill,
	useDefaultColorTheme,
} from '../../shared/ShapeFill'
import { getPerfectDashProps } from '../../shared/getPerfectDashProps'

export const DashStylePolygon = React.memo(function DashStylePolygon({
	dash,
	fill,
	color,
	strokeWidth,
	outline,
	lines,
}: Pick<TLGeoShape['props'], 'dash' | 'fill' | 'color'> & {
	strokeWidth: number
	outline: VecLike[]
	lines?: VecLike[][]
}) {
	const theme = useDefaultColorTheme()
	const innerPath = 'M' + outline[0] + 'L' + outline.slice(1) + 'Z'

	return (
		<>
			<ShapeFill theme={theme} d={innerPath} fill={fill} color={color} />
			<g strokeWidth={strokeWidth} stroke={theme[color].solid} fill="none" pointerEvents="all">
				{Array.from(Array(outline.length)).map((_, i) => {
					const A = outline[i]
					const B = outline[(i + 1) % outline.length]

					const dist = Vec2d.Dist(A, B)

					const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(dist, strokeWidth, {
						style: dash,
						start: 'outset',
						end: 'outset',
					})

					return (
						<line
							key={i}
							x1={A.x}
							y1={A.y}
							x2={B.x}
							y2={B.y}
							strokeDasharray={strokeDasharray}
							strokeDashoffset={strokeDashoffset}
						/>
					)
				})}
				{lines &&
					lines.map(([A, B], i) => {
						const dist = Vec2d.Dist(A, B)

						const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(dist, strokeWidth, {
							style: dash,
							start: 'skip',
							end: 'outset',
							snap: dash === 'dotted' ? 4 : undefined,
						})

						return (
							<path
								key={`line_fg_${i}`}
								d={`M${A.x},${A.y}L${B.x},${B.y}`}
								stroke={theme[color].solid}
								strokeWidth={strokeWidth}
								fill="none"
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
