import { TLGeoShape } from '@tldraw/editor'
import { useGetHashPatternZoomName } from '../../shared/defaultStyleDefs'
import { ShapeFill, ShapeFillProps } from '../../shared/ShapeFill'
import { useDefaultColorTheme } from '../../shared/useDefaultColorTheme'
import { TLGeoShapeResolvedStyles } from '../GeoShapeUtil'
import { getGeoShapePath } from '../getGeoShapePath'

export interface GeoShapeBodyProps {
	shape: TLGeoShape
	forceSolid: boolean
	styles: TLGeoShapeResolvedStyles
	/** Pattern URL for pattern fills - computed at render time based on zoom */
	patternUrl: string
}

/**
 * Props for the SVG export wrapper - doesn't require patternUrl since it
 * computes it using hooks (zoom level 1 for exports).
 */
export interface GeoShapeBodyForExportProps {
	shape: TLGeoShape
	styles: TLGeoShapeResolvedStyles
}

/**
 * Wrapper component for SVG exports that computes the pattern URL using hooks.
 * Use this in toSvg() since it can use hooks (it's rendered as a React component).
 */
export function GeoShapeBodyForExport({ shape, styles }: GeoShapeBodyForExportProps) {
	const getHashPatternZoomName = useGetHashPatternZoomName()
	const theme = useDefaultColorTheme()
	// Always use zoom level 1 for exports
	const patternUrl = getHashPatternZoomName(1, theme.id)

	return <GeoShapeBody shape={shape} forceSolid={false} styles={styles} patternUrl={patternUrl} />
}

export function GeoShapeBody({ shape, forceSolid, styles, patternUrl }: GeoShapeBodyProps) {
	const { dash } = shape.props
	const {
		// Stroke styles
		strokeWidth,
		strokeColor,
		strokeLinecap,
		strokeLinejoin,
		strokeOpacity,
		// Fill styles
		fillType,
		fillColor,
		fillOpacity,
		// Draw styles
		drawOffset,
		drawRoundness,
		drawPasses,
		// Dash styles
		dashLengthRatio,
		// Pattern styles
		patternColor,
	} = styles

	const path = getGeoShapePath(shape)

	// For draw style, use the resolved draw parameters
	const fillPath =
		dash === 'draw' && !forceSolid
			? path.toDrawD({
					strokeWidth,
					randomSeed: shape.id,
					passes: 1, // Use 1 pass for fill to avoid over-drawing
					offset: 0, // No offset for fill path
					onlyFilled: true,
				})
			: path.toD({ onlyFilled: true })

	// Build the fill props based on fillType
	// Use patternColor for pattern fills, fillColor for solid fills
	const fillProps: ShapeFillProps = (() => {
		switch (fillType) {
			case 'none':
				return { d: fillPath, type: 'none' as const }
			case 'solid':
				return { d: fillPath, type: 'solid' as const, color: fillColor, opacity: fillOpacity }
			case 'pattern':
				return {
					d: fillPath,
					type: 'pattern' as const,
					color: patternColor,
					patternUrl,
					opacity: fillOpacity,
				}
		}
	})()

	// Build stroke props based on dash style
	const strokeProps = {
		fill: 'none',
		stroke: strokeColor,
		strokeLinecap,
		strokeLinejoin,
		strokeOpacity,
	}

	// Render the stroke with appropriate style
	const strokeSvg = (() => {
		switch (dash) {
			case 'draw':
				return path.toSvg({
					style: 'draw',
					strokeWidth,
					forceSolid,
					randomSeed: shape.id,
					offset: drawOffset,
					roundness: drawRoundness,
					passes: drawPasses,
					props: strokeProps,
				})
			case 'dashed':
			case 'dotted':
				return path.toSvg({
					style: dash,
					strokeWidth,
					forceSolid,
					lengthRatio: dashLengthRatio,
					props: strokeProps,
				})
			case 'solid':
				return path.toSvg({
					style: 'solid',
					strokeWidth,
					forceSolid,
					props: strokeProps,
				})
		}
	})()

	return (
		<>
			<ShapeFill {...fillProps} />
			{strokeSvg}
		</>
	)
}
