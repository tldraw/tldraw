import { App, TLStyleCollections, useApp } from '@tldraw/editor'
import * as React from 'react'

export type TLUiStyle = {
	id: string
	icon: string
}

export type TLUiStyles = {
	[key: string]: TLUiStyle[]
}

// 	color: string[]
// 	fill: string[]
// 	dash: string[]
// 	size: string[]
// 	opacity: string[]
// 	font: string[]
// 	align: string[]
// 	verticalAlign: string[]
// 	geo: string[]
// 	arrowheadStart: string[]
// 	arrowheadEnd: string[]
// 	spline: string[]
// }

/** @internal */
export const StylesContext = React.createContext({} as TLUiStyles)

/** @public */
export type StylesProviderProps = {
	overrides?: (app: App, styles: TLUiStyles) => TLUiStyles
	children: any
}

/** @public */
export function StylesProvider({ overrides, children }: StylesProviderProps) {
	const app = useApp()

	return (
		<StylesContext.Provider
			value={overrides ? overrides(app, defaultStyles as TLUiStyles) : defaultStyles}
		>
			{children}
		</StylesContext.Provider>
	)
}

/** @public */
export function useStyles() {
	return React.useContext(StylesContext)
}

const defaultStyles: TLStyleCollections = {
	color: [
		{ id: 'black', type: 'color', icon: 'color' },
		{ id: 'grey', type: 'color', icon: 'color' },
		{ id: 'light-violet', type: 'color', icon: 'color' },
		{ id: 'violet', type: 'color', icon: 'color' },
		{ id: 'blue', type: 'color', icon: 'color' },
		{ id: 'light-blue', type: 'color', icon: 'color' },
		{ id: 'yellow', type: 'color', icon: 'color' },
		{ id: 'orange', type: 'color', icon: 'color' },
		{ id: 'green', type: 'color', icon: 'color' },
		{ id: 'light-green', type: 'color', icon: 'color' },
		{ id: 'light-red', type: 'color', icon: 'color' },
		{ id: 'red', type: 'color', icon: 'color' },
	],
	fill: [
		{ id: 'none', type: 'fill', icon: 'fill-none' },
		{ id: 'semi', type: 'fill', icon: 'fill-semi' },
		{ id: 'solid', type: 'fill', icon: 'fill-solid' },
		{ id: 'pattern', type: 'fill', icon: 'fill-pattern' },
	],
	dash: [
		{ id: 'draw', type: 'dash', icon: 'dash-draw' },
		{ id: 'dashed', type: 'dash', icon: 'dash-dashed' },
		{ id: 'dotted', type: 'dash', icon: 'dash-dotted' },
		{ id: 'solid', type: 'dash', icon: 'dash-solid' },
	],
	size: [
		{ id: 's', type: 'size', icon: 'size-small' },
		{ id: 'm', type: 'size', icon: 'size-medium' },
		{ id: 'l', type: 'size', icon: 'size-large' },
		{ id: 'xl', type: 'size', icon: 'size-extra-large' },
	],
	opacity: [
		{ id: '0.1', type: 'opacity', icon: 'color' },
		{ id: '0.25', type: 'opacity', icon: 'color' },
		{ id: '0.5', type: 'opacity', icon: 'color' },
		{ id: '0.75', type: 'opacity', icon: 'color' },
		{ id: '1', type: 'opacity', icon: 'color' },
	],
	font: [
		{ id: 'draw', type: 'font', icon: 'font-draw' },
		{ id: 'sans', type: 'font', icon: 'font-sans' },
		{ id: 'serif', type: 'font', icon: 'font-serif' },
		{ id: 'mono', type: 'font', icon: 'font-mono' },
	],
	align: [
		{ id: 'start', type: 'align', icon: 'text-align-left' },
		{ id: 'middle', type: 'align', icon: 'text-align-center' },
		{ id: 'end', type: 'align', icon: 'text-align-right' },
	],
	verticalAlign: [
		{ id: 'start', type: 'verticalAlign', icon: 'vertical-align-start' },
		{ id: 'middle', type: 'verticalAlign', icon: 'vertical-align-center' },
		{ id: 'end', type: 'verticalAlign', icon: 'vertical-align-end' },
	],
	geo: [
		{ id: 'rectangle', type: 'geo', icon: 'geo-rectangle' },
		{ id: 'ellipse', type: 'geo', icon: 'geo-ellipse' },
		{ id: 'triangle', type: 'geo', icon: 'geo-triangle' },
		{ id: 'diamond', type: 'geo', icon: 'geo-diamond' },
		{ id: 'pentagon', type: 'geo', icon: 'geo-pentagon' },
		{ id: 'hexagon', type: 'geo', icon: 'geo-hexagon' },
		{ id: 'octagon', type: 'geo', icon: 'geo-octagon' },
		{ id: 'star', type: 'geo', icon: 'geo-star' },
		{ id: 'rhombus', type: 'geo', icon: 'geo-rhombus' },
		{ id: 'rhombus-2', type: 'geo', icon: 'geo-rhombus-2' },
		{ id: 'oval', type: 'geo', icon: 'geo-oval' },
		{ id: 'trapezoid', type: 'geo', icon: 'geo-trapezoid' },
		{ id: 'arrow-right', type: 'geo', icon: 'geo-arrow-right' },
		{ id: 'arrow-left', type: 'geo', icon: 'geo-arrow-left' },
		{ id: 'arrow-up', type: 'geo', icon: 'geo-arrow-up' },
		{ id: 'arrow-down', type: 'geo', icon: 'geo-arrow-down' },
		{ id: 'x-box', type: 'geo', icon: 'geo-x-box' },
		{ id: 'check-box', type: 'geo', icon: 'geo-check-box' },
	],
	arrowheadStart: [
		{ id: 'none', type: 'arrowheadStart', icon: 'arrowhead-none' },
		{ id: 'arrow', type: 'arrowheadStart', icon: 'arrowhead-arrow' },
		{ id: 'triangle', type: 'arrowheadStart', icon: 'arrowhead-triangle' },
		{ id: 'square', type: 'arrowheadStart', icon: 'arrowhead-square' },
		{ id: 'dot', type: 'arrowheadStart', icon: 'arrowhead-dot' },
		{ id: 'diamond', type: 'arrowheadStart', icon: 'arrowhead-diamond' },
		{ id: 'inverted', type: 'arrowheadStart', icon: 'arrowhead-triangle-inverted' },
		{ id: 'bar', type: 'arrowheadStart', icon: 'arrowhead-bar' },
	],
	arrowheadEnd: [
		{ id: 'none', type: 'arrowheadEnd', icon: 'arrowhead-none' },
		{ id: 'arrow', type: 'arrowheadEnd', icon: 'arrowhead-arrow' },
		{ id: 'triangle', type: 'arrowheadEnd', icon: 'arrowhead-triangle' },
		{ id: 'square', type: 'arrowheadEnd', icon: 'arrowhead-square' },
		{ id: 'dot', type: 'arrowheadEnd', icon: 'arrowhead-dot' },
		{ id: 'diamond', type: 'arrowheadEnd', icon: 'arrowhead-diamond' },
		{ id: 'inverted', type: 'arrowheadEnd', icon: 'arrowhead-triangle-inverted' },
		{ id: 'bar', type: 'arrowheadEnd', icon: 'arrowhead-bar' },
	],
	spline: [
		{ id: 'line', type: 'spline', icon: 'spline-line' },
		{ id: 'cubic', type: 'spline', icon: 'spline-cubic' },
	],
}
