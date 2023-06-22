import { useValue } from '@tldraw/state'
import {
	TLDefaultColorStyle,
	TLDefaultColorTheme,
	TLDefaultFillStyle,
	getDefaultColorTheme,
} from '@tldraw/tlschema'
import * as React from 'react'
import { HASH_PATTERN_ZOOM_NAMES } from '../../../constants'
import { useEditor } from '../../../hooks/useEditor'

export interface ShapeFillProps {
	d: string
	fill: TLDefaultFillStyle
	color: TLDefaultColorStyle
}

export function useDefaultColorTheme() {
	const editor = useEditor()
	return getDefaultColorTheme(editor)
}

export const ShapeFill = React.memo(function ShapeFill({ d, color, fill }: ShapeFillProps) {
	const theme = useDefaultColorTheme()
	switch (fill) {
		case 'none': {
			return <path className={'tl-hitarea-stroke'} fill="none" d={d} />
		}
		case 'solid': {
			return <path className={'tl-hitarea-fill-solid'} fill={theme[color].semi} d={d} />
		}
		case 'semi': {
			return <path className={'tl-hitarea-fill-solid'} fill={theme.solid} d={d} />
		}
		case 'pattern': {
			return <PatternFill color={color} fill={fill} d={d} />
		}
	}
})

const PatternFill = function PatternFill({ d, color }: ShapeFillProps) {
	const editor = useEditor()
	const theme = useDefaultColorTheme()
	const zoomLevel = useValue('zoomLevel', () => editor.zoomLevel, [editor])
	const isDarkMode = useValue('isDarkMode', () => editor.isDarkMode, [editor])

	const intZoom = Math.ceil(zoomLevel)
	const teenyTiny = editor.zoomLevel <= 0.18

	return (
		<>
			<path className={'tl-hitarea-fill-solid'} fill={theme[color].pattern} d={d} />
			<path
				fill={
					teenyTiny
						? theme[color].semi
						: `url(#${HASH_PATTERN_ZOOM_NAMES[intZoom + (isDarkMode ? '_dark' : '_light')]})`
				}
				d={d}
			/>
		</>
	)
}

export function getShapeFillSvg({
	d,
	color,
	fill,
	theme,
}: ShapeFillProps & { theme: TLDefaultColorTheme }) {
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
