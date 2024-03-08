import { TLGeoShape, TLShapeId } from '@tldraw/editor'
import * as React from 'react'
import { ShapeFill, useDefaultColorTheme } from '../../shared/ShapeFill'
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
