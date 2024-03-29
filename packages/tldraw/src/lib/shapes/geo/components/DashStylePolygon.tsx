import { TLGeoShape, Vec, VecLike } from '@tldraw/editor'
import * as React from 'react'
import { ShapeFill, useDefaultColorTheme } from '../../shared/ShapeFill'
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

					const dist = Vec.Dist(A, B)

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
						const dist = Vec.Dist(A, B)

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
