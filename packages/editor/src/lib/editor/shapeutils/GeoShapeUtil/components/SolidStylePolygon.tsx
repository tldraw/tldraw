import { VecLike } from '@tldraw/primitives'
import * as React from 'react'
import { TLGeoShape } from '../../../../schema/shapes/TLGeoShape'
import { ShapeFill, getShapeFillSvg, getSvgWithShapeFill } from '../../shared/ShapeFill'
import { TLExportColors } from '../../shared/TLExportColors'

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
	let path = 'M' + outline[0] + 'L' + outline.slice(1) + 'Z'

	if (lines) {
		for (const [A, B] of lines) {
			path += `M${A.x},${A.y}L${B.x},${B.y}`
		}
	}

	return (
		<>
			<ShapeFill d={path} fill={fill} color={color} />
			<path d={path} stroke={`var(--palette-${color}`} strokeWidth={strokeWidth} fill="none" />
		</>
	)
})

export function SolidStylePolygonSvg({
	outline,
	lines,
	fill,
	color,
	strokeWidth,
	colors,
}: Pick<TLGeoShape['props'], 'fill' | 'color'> & {
	outline: VecLike[]
	strokeWidth: number
	colors: TLExportColors
	lines?: VecLike[][]
}) {
	const pathData = 'M' + outline[0] + 'L' + outline.slice(1) + 'Z'

	const fillPathData = pathData
	let strokePathData = pathData

	if (lines) {
		for (const [A, B] of lines) {
			strokePathData += `M${A.x},${A.y}L${B.x},${B.y}`
		}
	}

	const strokeElement = document.createElementNS('http://www.w3.org/2000/svg', 'path')
	strokeElement.setAttribute('d', strokePathData)
	strokeElement.setAttribute('stroke-width', strokeWidth.toString())
	strokeElement.setAttribute('stroke', colors.fill[color])
	strokeElement.setAttribute('fill', 'none')

	// Get the fill element, if any
	const fillElement = getShapeFillSvg({
		d: fillPathData,
		fill,
		color,
		colors,
	})

	return getSvgWithShapeFill(strokeElement, fillElement)
}
