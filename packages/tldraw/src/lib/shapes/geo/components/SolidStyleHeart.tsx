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
	const o = w / 4
	const k = h / 4
	const d = `
		M${0},${k * 1.2}
		C${0},${-k * 0.32},${o * 1.85},${-k * 0.32},${o * 2},${k * 0.9}
		C${o * 2.15},${-k * 0.32},${w},${-k * 0.32},${w},${k * 1.2}
		C${w},${k * 2.5},${o * 2.5},${k * 3},${o * 2},${h}
		C${o * 1.5},${k * 3},${0},${k * 2.5},${0},${k * 1.2}
	`
	return d
}

export function getHeartLength(w: number, h: number) {
	const o = w / 4
	const k = h / 4
	const C1 = new CubicBezier2d({
		start: new Vec(0, w / 4),
		cp1: new Vec(0, -k * 0.32),
		cp2: new Vec(o * 1.85, -k * 0.32),
		end: new Vec(o * 2, k * 0.9),
	})
	const C2 = new CubicBezier2d({
		start: new Vec(o * 2, h),
		cp1: new Vec(o * 1.5, k * 3),
		cp2: new Vec(0, k * 2.5),
		end: new Vec(0, k * 1.2),
	})
	let length = 0
	let p1 = C1.a
	let p2 = C2.a
	let n1: Vec
	let n2: Vec
	for (let i = 1; i <= 100; i++) {
		n1 = CubicBezier2d.GetAtT(C1, i / 100)
		n2 = CubicBezier2d.GetAtT(C2, i / 100)
		length += Vec.Dist2(p1, n1)
		length += Vec.Dist2(p2, n2)
		p1 = n1
		p2 = n2
	}
	return Math.sqrt(length) * 2
}
