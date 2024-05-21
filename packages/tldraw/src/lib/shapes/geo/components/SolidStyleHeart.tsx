import { TLGeoShape } from '@tldraw/editor'
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
	const d = getHeartIndicatorPath(w, h)
	return (
		<>
			<ShapeFill d={d} color={color} fill={fill} theme={theme} />
			<path d={d} stroke={theme[color].solid} strokeWidth={sw} fill="none" />
		</>
	)
})

export function getHeartIndicatorPath(w: number, h: number) {
	const o = w / 4
	const k = h / 4
	const HC = k * 0.9
	const d = `
		M${0},${k * 1.2}
		C${0},${-k * 0.32},${o * 1.85},${-k * 0.32},${o * 2},${HC}
		C${o * 2.15},${-k * 0.32},${w},${-k * 0.32},${w},${k * 1.2}
		C${w},${k * 2.5},${o * 2.5},${k * 3},${o * 2},${h}
		C${o * 1.5},${k * 3},${0},${k * 2.5},${0},${k * 1.2}
	`
	return d
}
