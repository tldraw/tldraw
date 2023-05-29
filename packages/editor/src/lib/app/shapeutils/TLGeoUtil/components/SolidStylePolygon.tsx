import { VecLike } from '@tldraw/primitives'
import { ColorStyle, SizeStyle, TLGeoShape } from '@tldraw/tlschema'
import * as React from 'react'
import { App } from '../../../App'
import { ShapeFill, getShapeFillSvg, getSvgWithShapeFill } from '../../shared/ShapeFill'
import { getLines } from '../helpers'

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

export function SolidStylePolygonSvg({ shape, app }: { shape: TLGeoShape; app: App }) {
	const { color, size, fill } = shape.props

	const fillColor = app.getStyle<ColorStyle>({
		type: 'color',
		id: color,
		theme: app.isDarkMode ? 'dark' : 'default',
		variant: 'default',
	}).value

	const sw = app.getStyle<SizeStyle>({
		type: 'size',
		id: size,
		variant: 'strokeWidth',
	}).value

	const outline = app.getShapeUtil(shape).outline(shape)
	const lines = getLines(shape.props, sw)

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
	strokeElement.setAttribute('stroke-width', sw.toString())
	strokeElement.setAttribute('stroke', fillColor)
	strokeElement.setAttribute('fill', 'none')

	// Get the fill element, if any
	const fillElement = getShapeFillSvg({
		d: fillPathData,
		fill,
		color,
		app,
	})

	return getSvgWithShapeFill(strokeElement, fillElement)
}
