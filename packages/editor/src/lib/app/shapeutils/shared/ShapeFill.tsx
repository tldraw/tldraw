import { ColorStyle, TLColorType, TLFillType } from '@tldraw/tlschema'
import * as React from 'react'
import { useValue } from 'signia-react'
import { HASH_PATERN_ZOOM_NAMES } from '../../../constants'
import { useApp } from '../../../hooks/useApp'
import { App } from '../../App'
import { useTheme } from './useTheme'

export interface ShapeFillProps {
	d: string
	fill: TLFillType
	color: TLColorType
}

export const ShapeFill = React.memo(function ShapeFill({ d, color, fill }: ShapeFillProps) {
	const app = useApp()
	const theme = useTheme()

	switch (fill) {
		case 'none': {
			return <path className={'tl-hitarea-stroke'} fill="none" d={d} />
		}
		case 'solid': {
			const fillColor = app.getStyle<ColorStyle>({
				type: 'color',
				id: color,
				theme,
				variant: 'semi',
			})
			return <path className={'tl-hitarea-fill-solid'} fill={fillColor.value} d={d} />
		}
		case 'semi': {
			const fillColor = app.getStyle<ColorStyle>({
				type: 'color',
				id: 'solid',
				theme,
				variant: 'default',
			})
			return <path className={'tl-hitarea-fill-solid'} fill={fillColor.value} d={d} />
		}
		case 'pattern': {
			return <PatternFill color={color} fill={fill} d={d} theme={theme} />
		}
	}
})

const PatternFill = function PatternFill({
	d,
	color,
	theme,
}: ShapeFillProps & { theme: 'dark' | 'default' }) {
	const app = useApp()
	const zoomLevel = useValue('zoomLevel', () => app.zoomLevel, [app])
	const intZoom = Math.ceil(zoomLevel)
	const teenyTiny = app.zoomLevel <= 0.18

	const patternColor = app.getStyle<ColorStyle>({
		type: 'color',
		id: color,
		theme,
		variant: 'pattern',
	}).value

	return (
		<>
			<path className="tl-hitarea-fill-solid" fill={patternColor} d={d} />
			<path
				fill={
					teenyTiny
						? app.getStyle<ColorStyle>({
								type: 'color',
								id: color,
								theme,
								variant: 'pattern',
						  }).value
						: `url(#${
								HASH_PATERN_ZOOM_NAMES[`${intZoom}_${theme === 'default' ? 'light' : 'dark'}`]
						  })`
				}
				d={d}
			/>
		</>
	)
}

export function getShapeFillSvg({ d, color, fill, app }: ShapeFillProps & { app: App }) {
	if (fill === 'none') {
		return
	}

	if (fill === 'pattern') {
		const gEl = document.createElementNS('http://www.w3.org/2000/svg', 'g')
		const path1El = document.createElementNS('http://www.w3.org/2000/svg', 'path')
		path1El.setAttribute('d', d)
		path1El.setAttribute(
			'fill',
			app.getStyle<ColorStyle>({
				type: 'color',
				id: color,
				theme: app.isDarkMode ? 'dark' : 'default',
				variant: 'pattern',
			}).value
		)

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
			path.setAttribute(
				'fill',
				app.getStyle<ColorStyle>({
					type: 'color',
					id: 'solid',
					theme: app.isDarkMode ? 'dark' : 'default',
				}).value
			)
			break
		}
		case 'solid': {
			{
				path.setAttribute(
					'fill',
					app.getStyle<ColorStyle>({
						type: 'color',
						id: color,
						theme: app.isDarkMode ? 'dark' : 'default',
						variant: 'semi',
					}).value
				)
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
