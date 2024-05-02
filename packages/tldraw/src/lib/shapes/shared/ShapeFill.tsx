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

export function getShapeFillSvg({ d, color, fill, theme }: ShapeFillProps) {
	if (fill === 'none') {
		return
	}

	if (fill === 'pattern') {
		const gEl = document.createElementNS('http://www.w3.org/2000/svg', 'g')
		const path1El = document.createElementNS('http://www.w3.org/2000/svg', 'path')
		path1El.setAttribute('d', d)
		path1El.setAttribute('fill', theme[color].pattern)

		const path2El = document.createElementNS('http://www.w3.org/2000/svg', 'path')
		path2El.setAttribute('d', d)
		path2El.setAttribute('fill', `url(#hash_pattern)`)

		gEl.appendChild(path1El)
		gEl.appendChild(path2El)
		return gEl
	}

	const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
	path.setAttribute('d', d)

	switch (fill) {
		case 'semi': {
			path.setAttribute('fill', theme.solid)
			break
		}
		case 'solid': {
			{
				path.setAttribute('fill', theme[color].semi)
			}
			break
		}
	}

	return path
}

export function getSvgWithShapeFill(foregroundPath: SVGElement, backgroundPath?: SVGElement) {
	if (backgroundPath) {
		// If there is a fill element, return a group containing the fill and the path
		const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
		g.appendChild(backgroundPath)
		g.appendChild(foregroundPath)
		return g
	} else {
		// Otherwise, just return the path
		return foregroundPath
	}
}
