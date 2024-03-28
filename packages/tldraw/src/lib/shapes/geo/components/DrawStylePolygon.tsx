import { TLGeoShape, VecLike } from '@tldraw/editor'
import * as React from 'react'
import { ShapeFill, useDefaultColorTheme } from '../../shared/ShapeFill'
import { getRoundedInkyPolygonPath, getRoundedPolygonPoints } from '../../shared/polygon-helpers'

export const DrawStylePolygon = React.memo(function DrawStylePolygon({
	id,
	outline,
	lines,
	fill,
	color,
	strokeWidth,
}: Pick<TLGeoShape['props'], 'fill' | 'color'> & {
	id: TLGeoShape['id']
	outline: VecLike[]
	strokeWidth: number
	lines?: VecLike[][]
}) {
	const theme = useDefaultColorTheme()
	const polygonPoints = getRoundedPolygonPoints(id, outline, strokeWidth / 3, strokeWidth * 2, 2)
	let strokePathData = getRoundedInkyPolygonPath(polygonPoints)

	if (lines) {
		for (const [A, B] of lines) {
			strokePathData += `M${A.x},${A.y}L${B.x},${B.y}`
		}
	}

	const innerPolygonPoints = getRoundedPolygonPoints(id, outline, 0, strokeWidth * 2, 1)
	const innerPathData = getRoundedInkyPolygonPath(innerPolygonPoints)

	return (
		<>
			<ShapeFill d={innerPathData} fill={fill} color={color} theme={theme} />
			<path d={strokePathData} stroke={theme[color].solid} strokeWidth={strokeWidth} fill="none" />
		</>
	)
})
