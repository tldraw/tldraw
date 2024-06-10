import {
	TLDefaultColorStyle,
	TLDefaultColorTheme,
	TLDefaultFillStyle,
	getDefaultColorTheme,
	useEditor,
	useIsDarkMode,
	useSvgExportContext,
	useValue,
} from '@tldraw/editor'
import React from 'react'
import { getHashPatternZoomName } from './defaultStyleDefs'

export interface ShapeFillProps {
	d: string
	fill: TLDefaultFillStyle
	color: TLDefaultColorStyle
	theme: TLDefaultColorTheme
}

/** @public */
export function useDefaultColorTheme() {
	return getDefaultColorTheme({ isDarkMode: useIsDarkMode() })
}

export const ShapeFill = React.memo(function ShapeFill({ theme, d, color, fill }: ShapeFillProps) {
	switch (fill) {
		case 'none': {
			return null
		}
		case 'solid': {
			return <path fill={theme[color].semi} d={d} />
		}
		case 'semi': {
			return <path fill={theme.solid} d={d} />
		}
		case 'pattern': {
			return <PatternFill theme={theme} color={color} fill={fill} d={d} />
		}
	}
})

export function PatternFill({ d, color, theme }: ShapeFillProps) {
	const editor = useEditor()
	const svgExport = useSvgExportContext()
	const zoomLevel = useValue('zoomLevel', () => editor.getZoomLevel(), [editor])

	const teenyTiny = editor.getZoomLevel() <= 0.18

	return (
		<>
			<path fill={theme[color].pattern} d={d} />
			<path
				fill={
					svgExport
						? `url(#${getHashPatternZoomName(1, theme.id)})`
						: teenyTiny
							? theme[color].semi
							: `url(#${getHashPatternZoomName(zoomLevel, theme.id)})`
				}
				d={d}
			/>
		</>
	)
}
