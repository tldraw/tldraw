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

/**
 * Discriminated union for shape fill props.
 * Each fill type has exactly the props it needs - no invalid states.
 *
 * @internal
 */
export type ShapeFillProps =
	| { d: string; type: 'none' }
	| { d: string; type: 'solid'; color: string; opacity?: number }
	| { d: string; type: 'pattern'; color: string; patternUrl: string; opacity?: number }

/**
 * Low-level shape fill component with fully resolved props.
 * No hooks or theme lookups - all values must be pre-computed by the caller.
 *
 * @internal
 */
export const ShapeFill = React.memo(function ShapeFill(props: ShapeFillProps) {
	switch (props.type) {
		case 'none':
			return null
		case 'solid':
			return <path fill={props.color} fillOpacity={props.opacity} d={props.d} />
		case 'pattern':
			return (
				<>
					<path fill={props.color} fillOpacity={props.opacity} d={props.d} />
					<path fill={`url(#${props.patternUrl})`} fillOpacity={props.opacity} d={props.d} />
				</>
			)
	}
})

/* --------------------- Legacy ShapeFill --------------------- */

/**
 * Legacy interface for ShapeFill - used by arrow and draw shapes.
 * This computes fill colors internally from theme and props.
 *
 * @deprecated Use ShapeFill with discriminated union props instead.
 */
interface LegacyShapeFillProps {
	d: string
	fill: TLDefaultFillStyle
	color: TLDefaultColorStyle
	theme: TLDefaultColorTheme
	scale: number
}

/**
 * Legacy ShapeFill component that computes fill colors internally.
 * Used by arrow and draw shapes for backward compatibility.
 *
 * @deprecated Use ShapeFill with discriminated union props instead.
 */
export const LegacyShapeFill = React.memo(function LegacyShapeFill({
	theme,
	d,
	color,
	fill,
// eslint-disable-next-line @typescript-eslint/no-deprecated
}: LegacyShapeFillProps) {
	switch (fill) {
		case 'none': {
			return null
		}
		case 'solid': {
			return <path fill={getColorValue(theme, color, 'semi')} d={d} />
		}
		case 'semi': {
			return <path fill={theme.solid} d={d} />
		}
		case 'fill': {
			return <path fill={getColorValue(theme, color, 'fill')} d={d} />
		}
		case 'pattern': {
			return <LegacyPatternFill theme={theme} color={color} fill={fill} d={d} scale={1} />
		}
		case 'lined-fill': {
			return <path fill={getColorValue(theme, color, 'linedFill')} d={d} />
		}
	}
})

// eslint-disable-next-line @typescript-eslint/no-deprecated
function LegacyPatternFill({ d, color, theme }: LegacyShapeFillProps) {
	const editor = useEditor()
	const svgExport = useSvgExportContext()
	const zoomLevel = useValue('zoomLevel', () => editor.getEfficientZoomLevel(), [editor])
	const getHashPatternZoomName = useGetHashPatternZoomName()

	const teenyTiny = zoomLevel <= 0.18

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
