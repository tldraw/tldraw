import {
	TLDefaultColorStyle,
	TLDefaultFillStyle,
	useEditor,
	useSvgExportContext,
	useValue,
} from '@tldraw/editor'
import React from 'react'
import { ColorStyleUtil } from '../../styles/TLColorStyle'
import { useGetHashPatternZoomName } from './defaultStyleDefs'

interface ShapeFillProps {
	d: string
	fill: TLDefaultFillStyle
	color: TLDefaultColorStyle
	theme?: 'light' | 'dark' | string
	scale: number
}

export const ShapeFill = React.memo(function ShapeFill({
	theme,
	d,
	color,
	fill,
	scale,
}: ShapeFillProps) {
	const editor = useEditor()

	switch (fill) {
		case 'none': {
			return null
		}
		case 'solid': {
			return (
				<path fill={editor.getStyleUtil(ColorStyleUtil).toCssColor(color, 'semi', theme)} d={d} />
			)
		}
		case 'semi': {
			return (
				<path fill={editor.getStyleUtil(ColorStyleUtil).toCssColor(color, 'solid', theme)} d={d} />
			)
		}
		case 'fill': {
			return (
				<path fill={editor.getStyleUtil(ColorStyleUtil).toCssColor(color, 'fill', theme)} d={d} />
			)
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

	// For pattern fills, we need a theme ID for the hash pattern zoom name
	// Since theme is now optional, we need to determine the current theme
	const currentTheme = theme ?? (editor.user.getIsDarkMode() ? 'dark' : 'light')
	// For backwards compatibility, we construct a theme object with an id
	const themeId = currentTheme === 'dark' ? 'dark' : 'light'

	return (
		<>
			<path fill={editor.getStyleUtil(ColorStyleUtil).toCssColor(color, 'pattern', theme)} d={d} />
			<path
				fill={
					svgExport
						? `url(#${getHashPatternZoomName(1, themeId)})`
						: teenyTiny
							? editor.getStyleUtil(ColorStyleUtil).toCssColor(color, 'semi', theme)
							: `url(#${getHashPatternZoomName(zoomLevel, themeId)})`
				}
				d={d}
			/>
		</>
	)
}
