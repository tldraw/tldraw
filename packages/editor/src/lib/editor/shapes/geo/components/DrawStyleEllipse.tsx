import {
	EASINGS,
	getStrokeOutlinePoints,
	getStrokePoints,
	perimeterOfEllipse,
	PI2,
	setStrokePointRadii,
	TAU,
	Vec2d,
} from '@tldraw/primitives'
import { TLDefaultColorTheme, TLGeoShape, TLShapeId } from '@tldraw/tlschema'
import { rng } from '@tldraw/utils'
import * as React from 'react'
import { getSvgPathFromStroke, getSvgPathFromStrokePoints } from '../../../../utils/svg'
import {
	getShapeFillSvg,
	getSvgWithShapeFill,
	ShapeFill,
	useDefaultColorTheme,
} from '../../shared/ShapeFill'

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
	const theme = useDefaultColorTheme()
	const innerPath = getEllipseIndicatorPath(id, w, h, sw)
	const outerPath = getEllipsePath(id, w, h, sw)

	return (
		<>
			<ShapeFill d={innerPath} color={color} fill={fill} />
			<path d={outerPath} fill={theme[color].solid} strokeWidth={0} pointerEvents="all" />
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
	theme,
}: Pick<TLGeoShape['props'], 'w' | 'h' | 'fill' | 'color'> & {
	strokeWidth: number
	id: TLShapeId
	theme: TLDefaultColorTheme
}) {
	const strokeElement = document.createElementNS('http://www.w3.org/2000/svg', 'path')
	strokeElement.setAttribute('d', getEllipsePath(id, w, h, sw))
	strokeElement.setAttribute('fill', theme[color].solid)

	// Get the fill element, if any
	const fillElement = getShapeFillSvg({
		d: getEllipseIndicatorPath(id, w, h, sw),
		fill,
		color,
		theme,
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
