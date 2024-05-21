import { CubicBezier2d, TLGeoShape, Vec } from '@tldraw/editor'
import * as React from 'react'
import { ShapeFill, useDefaultColorTheme } from '../../shared/ShapeFill'

export const SolidStyleHeart = React.memo(function SolidStyleHeart({
	w,
	h,
	strokeWidth: sw,
	fill,
	color,
}: Pick<TLGeoShape['props'], 'w' | 'h' | 'fill' | 'color'> & {
	strokeWidth: number
}) {
	const theme = useDefaultColorTheme()
	const d = getHeartPath(w, h)
	return (
		<>
			<ShapeFill d={d} color={color} fill={fill} theme={theme} />
			<path d={d} stroke={theme[color].solid} strokeWidth={sw} fill="none" />
		</>
	)
})

export function getHeartPath(w: number, h: number) {
	return (
		getHeartCurves(w, h)
			.map((c, i) => CubicBezier2d.GetSvgPath(c, i === 0))
			.join(' ') + ' Z'
	)
}

export function getHeartPoints(w: number, h: number) {
	const points = [] as Vec[]
	const curves = getHeartCurves(w, h)
	for (let i = 0; i < curves.length; i++) {
		for (let j = 0; j < 20; j++) {
			points.push(CubicBezier2d.GetAtT(curves[i], j / 20))
		}
		if (i === curves.length - 1) {
			points.push(CubicBezier2d.GetAtT(curves[i], 1))
		}
	}
}

export function getHeartCurves(w: number, h: number) {
	const o = w / 4
	const k = h / 4
	return [
		new CubicBezier2d({
			start: new Vec(w / 2, h),
			cp1: new Vec(o * 1.5, k * 3),
			cp2: new Vec(0, k * 2.5),
			end: new Vec(0, k * 1.2),
		}),
		new CubicBezier2d({
			start: new Vec(0, k * 1.2),
			cp1: new Vec(0, -k * 0.32),
			cp2: new Vec(o * 1.85, -k * 0.32),
			end: new Vec(w / 2, k * 0.9),
		}),
		new CubicBezier2d({
			start: new Vec(w / 2, k * 0.9),
			cp1: new Vec(o * 2.15, -k * 0.32),
			cp2: new Vec(w, -k * 0.32),
			end: new Vec(w, k * 1.2),
		}),
		new CubicBezier2d({
			start: new Vec(w, k * 1.2),
			cp1: new Vec(w, k * 2.5),
			cp2: new Vec(o * 2.5, k * 3),
			end: new Vec(w / 2, h),
		}),
	]
}
