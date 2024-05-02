import { TLDefaultColorTheme, TLGeoShape, VecLike } from '@tldraw/editor'
import * as React from 'react'
import {
	ShapeFill,
	getShapeFillSvg,
	getSvgWithShapeFill,
	useDefaultColorTheme,
} from '../../shared/ShapeFill'

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

export function SolidStylePolygonSvg({
	outline,
	lines,
	fill,
	color,
	strokeWidth,
	theme,
}: Pick<TLGeoShape['props'], 'fill' | 'color'> & {
	outline: VecLike[]
	strokeWidth: number
	theme: TLDefaultColorTheme
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
	strokeElement.setAttribute('stroke', theme[color].solid)
	strokeElement.setAttribute('fill', 'none')

	// Get the fill element, if any
	const fillElement = getShapeFillSvg({
		d: fillPathData,
		fill,
		color,
		theme,
	})

	return getSvgWithShapeFill(strokeElement, fillElement)
}
