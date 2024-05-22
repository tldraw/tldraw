import { TLGeoShape } from '@tldraw/editor'
import * as React from 'react'
import { ShapeFill, useDefaultColorTheme } from '../../shared/ShapeFill'
import { getEllipsePath } from '../helpers'

export const SolidStyleEllipse = React.memo(function SolidStyleEllipse({
	w,
	h,
	strokeWidth: sw,
	fill,
	color,
}: Pick<TLGeoShape['props'], 'w' | 'h' | 'fill' | 'color'> & { strokeWidth: number }) {
	const theme = useDefaultColorTheme()
	const d = getEllipsePath(w, h)
	return (
		<>
			<ShapeFill d={d} color={color} fill={fill} theme={theme} />
			<path d={d} stroke={theme[color].solid} strokeWidth={sw} fill="none" />
		</>
	)
})
