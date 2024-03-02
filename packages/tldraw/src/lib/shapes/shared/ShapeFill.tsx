import {
	HASH_PATTERN_ZOOM_NAMES,
	TLDefaultColorStyle,
	TLDefaultColorTheme,
	TLDefaultFillStyle,
	getDefaultColorTheme,
	useEditor,
	useIsDarkMode,
	useValue,
} from '@tldraw/editor'
import React from 'react'

export interface ShapeFillProps {
	d: string
	fill: TLDefaultFillStyle
	color: TLDefaultColorStyle
	theme: TLDefaultColorTheme
}

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

const PatternFill = function PatternFill({ d, color, theme }: ShapeFillProps) {
	const editor = useEditor()
	const zoomLevel = useValue('zoomLevel', () => editor.getZoomLevel(), [editor])

	const intZoom = Math.ceil(zoomLevel)
	const teenyTiny = editor.getZoomLevel() <= 0.18

	return (
		<>
			<path fill={theme[color].pattern} d={d} />
			<path
				fill={
					teenyTiny
						? theme[color].semi
						: `url(#${HASH_PATTERN_ZOOM_NAMES[`${intZoom}_${theme.id}`]})`
				}
				d={d}
			/>
		</>
	)
}

export function getShapeFillSvgString({ d, color, fill, theme }: ShapeFillProps) {
	switch (fill) {
		case 'pattern':
			return `<g xmlns="http://www.w3.org/2000/svg"><path xmlns="http://www.w3.org/2000/svg" d="${d}" fill="${theme[color].pattern}"/><path xmlns="http://www.w3.org/2000/svg" fill="url(#hash_pattern)" d="${d}"/></g>`
		case 'semi':
			return `<path xmlns="http://www.w3.org/2000/svg" d="${d}" fill="${theme.solid}"/>`
		case 'solid':
			return `<path xmlns="http://www.w3.org/2000/svg" d="${d}" fill="${theme[color].semi}"/>`
	}
	return ''
}

export function getSvgStringWithShapeFill(foregroundPath: string, backgroundPath?: string) {
	return backgroundPath
		? `<g xmlns="http://www.w3.org/2000/svg">${backgroundPath}${foregroundPath}</g>`
		: foregroundPath
}
