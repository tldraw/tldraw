import {
	EASINGS,
	PI2,
	TAU,
	Vec2d,
	getStrokeOutlinePoints,
	getStrokePoints,
	perimeterOfEllipse,
	setStrokePointRadii,
} from '@tldraw/primitives'
import { TLShapeId } from '@tldraw/tlschema'
import { rng } from '@tldraw/utils'
import React from 'react'
import { getSvgPathFromStroke, getSvgPathFromStrokePoints } from '../../../../../utils/svg'
import {
	ShapeFill,
	getShapeFillSvg,
	getSvgWithShapeFill,
} from '../../../../shapeutils/shared/ShapeFill'
import { TLExportColors } from '../../../../shapeutils/shared/TLExportColors'
import { TLGeoShape } from '../../geoShapeTypes'

export const DrawStyleEllipse = React.memo(function DrawStyleEllipse({
	id,
	w,
	h,
	strokeWidth: sw,
	fill,
	color,
}: Pick<TLGeoShape['props'], 'w' | 'h' | 'fill' | 'color'> & {
	strokeWidth: number
	id: TLShapeId
}) {
	const innerPath = getEllipseIndicatorPath(id, w, h, sw)
	const outerPath = getEllipsePath(id, w, h, sw)

	return (
		<>
			<ShapeFill d={innerPath} color={color} fill={fill} />
			<path d={outerPath} fill="currentColor" strokeWidth={0} pointerEvents="all" />
		</>
	)
})

export function DrawStyleEllipseSvg({
	id,
	w,
	h,
	strokeWidth: sw,
	fill,
	color,
	colors,
}: Pick<TLGeoShape['props'], 'w' | 'h' | 'fill' | 'color'> & {
	strokeWidth: number
	id: TLShapeId
	colors: TLExportColors
}) {
	const strokeElement = document.createElementNS('http://www.w3.org/2000/svg', 'path')
	strokeElement.setAttribute('d', getEllipsePath(id, w, h, sw))
	strokeElement.setAttribute('fill', colors.fill[color])

	// Get the fill element, if any
	const fillElement = getShapeFillSvg({
		d: getEllipseIndicatorPath(id, w, h, sw),
		fill,
		color,
		colors,
	})

	return getSvgWithShapeFill(strokeElement, fillElement)
}

export function getEllipseStrokeOptions(strokeWidth: number) {
	return {
		size: 1 + strokeWidth,
		thinning: 0.25,
		end: { taper: strokeWidth },
		start: { taper: strokeWidth },
		streamline: 0,
		smoothing: 1,
		simulatePressure: false,
	}
}

export function getEllipseStrokePoints(
	id: string,
	width: number,
	height: number,
	strokeWidth: number
) {
	const getRandom = rng(id)

	const rx = width / 2
	const ry = height / 2
	const perimeter = perimeterOfEllipse(rx, ry)

	const points: Vec2d[] = []

	const start = PI2 * getRandom()
	const length = PI2 + TAU / 2 + Math.abs(getRandom()) * TAU
	const count = Math.max(16, perimeter / 10)

	for (let i = 0; i < count; i++) {
		const t = i / (count - 1)
		const r = start + t * length
		const c = Math.cos(r)
		const s = Math.sin(r)
		points.push(
			new Vec2d(
				rx * c + width * 0.5 + 0.05 * getRandom(),
				ry * s + height / 2 + 0.05 * getRandom(),
				Math.min(
					1,
					0.5 +
						Math.abs(0.5 - (getRandom() > 0 ? EASINGS.easeInOutSine(t) : EASINGS.easeInExpo(t))) / 2
				)
			)
		)
	}

	return getStrokePoints(points, getEllipseStrokeOptions(strokeWidth))
}

export function getEllipsePath(id: string, width: number, height: number, strokeWidth: number) {
	const options = getEllipseStrokeOptions(strokeWidth)
	return getSvgPathFromStroke(
		getStrokeOutlinePoints(
			setStrokePointRadii(getEllipseStrokePoints(id, width, height, strokeWidth), options),
			options
		)
	)
}

export function getEllipseIndicatorPath(
	id: string,
	width: number,
	height: number,
	strokeWidth: number
) {
	return getSvgPathFromStrokePoints(getEllipseStrokePoints(id, width, height, strokeWidth))
}
