import {
	TLDefaultColorTheme,
	TLDefaultFillStyle,
	useEditor,
	useSvgExportContext,
	useValue,
} from '@tldraw/editor'
import React from 'react'
import { useGetHashPatternZoomName } from './defaultStyleDefs'

/** @public */
export interface ShapeFillColors {
	fillSolidColor: string
	fillColor: string
	fillPatternColor: string
	fillLinedFillColor: string
}

interface ShapeFillProps {
	d: string
	fill: TLDefaultFillStyle
	fillColors: ShapeFillColors
	theme: TLDefaultColorTheme
	scale: number
}

export const ShapeFill = React.memo(function ShapeFill({
	theme,
	d,
	fillColors,
	fill,
	scale,
}: ShapeFillProps) {
	switch (fill) {
		case 'none': {
			return null
		}
		case 'solid': {
			return <path fill={fillColors.fillSolidColor} d={d} />
		}
		case 'semi': {
			return <path fill={theme.solid} d={d} />
		}
		case 'fill': {
			return <path fill={fillColors.fillColor} d={d} />
		}
		case 'pattern': {
			return <PatternFill theme={theme} fillColors={fillColors} fill={fill} d={d} scale={scale} />
		}
		case 'lined-fill': {
			return <path fill={fillColors.fillLinedFillColor} d={d} />
		}
	}
})

export function PatternFill({ d, fillColors, theme }: ShapeFillProps) {
	const editor = useEditor()
	const svgExport = useSvgExportContext()
	const zoomLevel = useValue('zoomLevel', () => editor.getEfficientZoomLevel(), [editor])
	const getHashPatternZoomName = useGetHashPatternZoomName()

	const teenyTiny = zoomLevel <= 0.18

	return (
		<>
			<path fill={fillColors.fillPatternColor} d={d} />
			<path
				fill={
					svgExport
						? `url(#${getHashPatternZoomName(1, theme.id)})`
						: teenyTiny
							? fillColors.fillSolidColor
							: `url(#${getHashPatternZoomName(zoomLevel, theme.id)})`
				}
				d={d}
			/>
		</>
	)
}
