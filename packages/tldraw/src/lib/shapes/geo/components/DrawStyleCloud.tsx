import { TLDefaultColorTheme, TLGeoShape, TLShapeId } from '@tldraw/editor'
import * as React from 'react'
import {
	ShapeFill,
	getShapeFillSvg,
	getSvgWithShapeFill,
	useDefaultColorTheme,
} from '../../shared/ShapeFill'
import { inkyCloudSvgPath } from '../cloudOutline'

export const DrawStyleCloud = React.memo(function StyleCloud({
	fill,
	color,
	strokeWidth,
	w,
	h,
	id,
	size,
}: Pick<TLGeoShape['props'], 'fill' | 'color' | 'w' | 'h' | 'size'> & {
	strokeWidth: number
	id: TLShapeId
}) {
	const theme = useDefaultColorTheme()
	const path = inkyCloudSvgPath(w, h, id, size)

	return (
		<>
			<ShapeFill theme={theme} d={path} fill={fill} color={color} />
			<path d={path} stroke={theme[color].solid} strokeWidth={strokeWidth} fill="none" />
		</>
	)
})

export function DrawStyleCloudSvg({
	fill,
	color,
	strokeWidth,
	theme,
	w,
	h,
	id,
	size,
}: Pick<TLGeoShape['props'], 'fill' | 'color' | 'w' | 'h' | 'size'> & {
	strokeWidth: number
	theme: TLDefaultColorTheme
	id: TLShapeId
}) {
	const pathData = inkyCloudSvgPath(w, h, id, size)

	const strokeElement = document.createElementNS('http://www.w3.org/2000/svg', 'path')
	strokeElement.setAttribute('d', pathData)
	strokeElement.setAttribute('stroke-width', strokeWidth.toString())
	strokeElement.setAttribute('stroke', theme[color].solid)
	strokeElement.setAttribute('fill', 'none')

	// Get the fill element, if any
	const fillElement = getShapeFillSvg({
		d: pathData,
		fill,
		color,
		theme,
	})

	return getSvgWithShapeFill(strokeElement, fillElement)
}
