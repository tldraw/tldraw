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
	const { C1, C2 } = getHeartCurves(w, h)
	const d = `${CubicBezier2d.GetSvgPath(C1)} ${CubicBezier2d.GetSvgPath(C2)}`
	return d
}

export function getHeartCurves(w: number, h: number) {
	const o = w / 4
	const k = h / 4
	const C1 = new CubicBezier2d({
		start: new Vec(0, w / 4),
		cp1: new Vec(0, -k * 0.32),
		cp2: new Vec(o * 1.85, -k * 0.32),
		end: new Vec(w / 2, k * 0.9),
	})
	const C2 = new CubicBezier2d({
		start: new Vec(w / 2, h),
		cp1: new Vec(o * 1.5, k * 3),
		cp2: new Vec(0, k * 2.5),
		end: new Vec(0, k * 1.2),
	})
	return { C1, C2 }
}
