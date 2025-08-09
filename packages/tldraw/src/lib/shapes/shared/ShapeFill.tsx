import {
	getColorValue,
	TLDefaultColorStyle,
	TLDefaultColorTheme,
	TLDefaultFillStyle,
	useEditor,
	useSvgExportContext,
	useValue,
} from '@tldraw/editor'
import React from 'react'
import { useGetHashPatternZoomName } from './defaultStyleDefs'

interface ShapeFillProps {
	d: string
	fill: TLDefaultFillStyle
	color: TLDefaultColorStyle
	theme: TLDefaultColorTheme
	scale: number
}

export const ShapeFill = React.memo(function ShapeFill({
	theme,
	d,
	color,
	fill,
	scale,
}: ShapeFillProps) {
	const semi = getColorValue(theme, color, 'semi')
	const fillColor = getColorValue(theme, color, 'fill')

	switch (fill) {
		case 'none': {
			return null
		}
		case 'solid': {
			return <path fill={semi} d={d} />
		}
		case 'semi': {
			return <path fill={getColorValue(theme, color, 'solid')} d={d} />
		}
		case 'fill': {
			return <path fill={fillColor} d={d} />
		}
		case 'pattern': {
			return <PatternFill theme={theme} color={color} fill={fill} d={d} scale={scale} />
		}
	}
})

export function PatternFill({ d, color, theme }: ShapeFillProps) {
	const editor = useEditor()
	const svgExport = useSvgExportContext()
	const zoomLevel = useValue('zoomLevel', () => editor.getZoomLevel(), [editor])
	const getHashPatternZoomName = useGetHashPatternZoomName()

	const teenyTiny = editor.getZoomLevel() <= 0.18

	return (
		<>
			<path fill={getColorValue(theme, color, 'pattern')} d={d} />
			<path
				fill={
					svgExport
						? `url(#${getHashPatternZoomName(1, theme.id)})`
						: teenyTiny
							? getColorValue(theme, color, 'semi')
							: `url(#${getHashPatternZoomName(zoomLevel, theme.id)})`
				}
				d={d}
			/>
		</>
	)
}
