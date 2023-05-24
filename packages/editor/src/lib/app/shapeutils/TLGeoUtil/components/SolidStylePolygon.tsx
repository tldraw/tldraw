import { VecLike } from '@tldraw/primitives'
import { TLGeoShape } from '@tldraw/tlschema'
import * as React from 'react'
import { ShapeFill, getShapeFillSvg, getSvgWithShapeFill } from '../../shared/ShapeFill'
import { getColorForSvgExport } from '../../shared/getContainerColor'

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
	isDarkMode,
	strokeWidth,
}: Pick<TLGeoShape['props'], 'fill' | 'color'> & {
	outline: VecLike[]
	strokeWidth: number
	isDarkMode: boolean
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

	const fillColor = getColorForSvgExport({ type: 'fill', color, isDarkMode })

	const strokeElement = document.createElementNS('http://www.w3.org/2000/svg', 'path')
	strokeElement.setAttribute('d', strokePathData)
	strokeElement.setAttribute('stroke-width', strokeWidth.toString())
	strokeElement.setAttribute('stroke', fillColor)
	strokeElement.setAttribute('fill', 'none')

	// Get the fill element, if any
	const fillElement = getShapeFillSvg({
		d: fillPathData,
		fill,
		color,
		isDarkMode,
	})

	return getSvgWithShapeFill(strokeElement, fillElement)
}
