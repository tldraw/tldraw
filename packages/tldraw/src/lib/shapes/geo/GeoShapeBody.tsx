import { TLGeoShape } from '@tldraw/editor'
import { PatternFill } from '../shared/PatternFill'
import { GeoTypeDefinition, getGeoShapePath } from './getGeoShapePath'

export function GeoShapeBody({
	shape,
	shouldScale,
	forceSolid,
	strokeColor,
	strokeWidth: unscaledStrokeWidth,
	fillColor,
	patternFillFallbackColor,
	customGeoTypes,
}: {
	shape: TLGeoShape
	shouldScale: boolean
	forceSolid: boolean
	strokeColor: string
	strokeWidth: number
	fillColor: string
	patternFillFallbackColor: string
	customGeoTypes?: Record<string, GeoTypeDefinition>
}) {
	const scaleToUse = shouldScale ? shape.props.scale : 1
	const strokeWidth = unscaledStrokeWidth * scaleToUse
	const { dash, fill } = shape.props

	const path = getGeoShapePath(shape, unscaledStrokeWidth, customGeoTypes)
	const fillPath =
		dash === 'draw' && !forceSolid
			? path.toDrawD({ strokeWidth, randomSeed: shape.id, passes: 1, offset: 0, onlyFilled: true })
			: path.toD({ onlyFilled: true })

	return (
		<>
			{fill === 'none' ? null : fill === 'pattern' ? (
				<PatternFill
					d={fillPath}
					fillColor={fillColor}
					patternFillFallbackColor={patternFillFallbackColor}
					scale={scaleToUse}
				/>
			) : (
				<path fill={fillColor} d={fillPath} />
			)}
			{path.toSvg({
				style: dash,
				strokeWidth,
				forceSolid,
				randomSeed: shape.id,
				props: { fill: 'none', stroke: strokeColor },
			})}
		</>
	)
}
