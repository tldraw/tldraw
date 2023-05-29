import { ColorStyle, SizeStyle, TLGeoShape } from '@tldraw/tlschema'
import * as React from 'react'
import { App } from '../../../App'
import { ShapeFill, getShapeFillSvg, getSvgWithShapeFill } from '../../shared/ShapeFill'

export const SolidStyleOval = React.memo(function SolidStyleOval({
	w,
	h,
	strokeWidth: sw,
	fill,
	color,
}: Pick<TLGeoShape['props'], 'w' | 'h' | 'fill' | 'color'> & {
	strokeWidth: number
}) {
	const d = getOvalIndicatorPath(w, h)
	return (
		<>
			<ShapeFill d={d} color={color} fill={fill} />
			<path d={d} stroke={`var(--palette-${color})`} strokeWidth={sw} fill="none" />
		</>
	)
})

export function SolidStyleOvalSvg({ shape, app }: { shape: TLGeoShape; app: App }) {
	const { w, h, color, size, fill } = shape.props

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

	const d = getOvalIndicatorPath(w, h)

	const strokeElement = document.createElementNS('http://www.w3.org/2000/svg', 'path')
	strokeElement.setAttribute('d', d)
	strokeElement.setAttribute('stroke-width', sw.toString())
	strokeElement.setAttribute('width', w.toString())
	strokeElement.setAttribute('height', h.toString())
	strokeElement.setAttribute('fill', 'none')
	strokeElement.setAttribute('stroke', fillColor)

	// Get the fill element, if any
	const fillElement = getShapeFillSvg({
		d,
		fill,
		color,
		app,
	})

	return getSvgWithShapeFill(strokeElement, fillElement)
}

export function getOvalIndicatorPath(w: number, h: number) {
	let d: string

	if (h > w) {
		const offset = w / 2
		d = `
    M0,${offset}
    a${offset},${offset},0,1,1,${offset * 2},0
    L${w},${h - offset}
    a${offset},${offset},0,1,1,-${offset * 2},0
    Z`
	} else {
		const offset = h / 2
		d = `
    M${offset},0
    L${w - offset},0
    a${offset},${offset},0,1,1,0,${offset * 2}
    L${offset},${h}
    a${offset},${offset},0,1,1,0,${-offset * 2}
    Z`
	}

	return d
}
