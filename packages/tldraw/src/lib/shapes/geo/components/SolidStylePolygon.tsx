import { TLGeoShape, VecLike } from '@tldraw/editor'
import * as React from 'react'
import { ShapeFill, useDefaultColorTheme } from '../../shared/ShapeFill'

export const SolidStylePolygon = React.memo(function SolidStylePolygon({
	outline,
	lines,
	fill,
	color,
	strokeWidth,
}: Pick<TLGeoShape['props'], 'fill' | 'color'> & {
	outline: VecLike[]
	lines?: VecLike[][]
	strokeWidth: number
}) {
	const theme = useDefaultColorTheme()
	let path = 'M' + outline[0] + 'L' + outline.slice(1) + 'Z'

	if (lines) {
		for (const [A, B] of lines) {
			path += `M${A.x},${A.y}L${B.x},${B.y}`
		}
	}

	return (
		<>
			<ShapeFill d={path} fill={fill} color={color} theme={theme} />
			<path d={path} stroke={theme[color].solid} strokeWidth={strokeWidth} fill="none" />
		</>
	)
})
