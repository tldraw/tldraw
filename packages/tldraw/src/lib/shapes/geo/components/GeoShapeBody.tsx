import {
	TLDefaultFillStyle,
	TLGeoShape,
	useEditor,
	useIsDarkMode,
	useSvgExportContext,
	useValue,
} from '@tldraw/editor'
import { useGetHashPatternZoomName } from '../../shared/defaultStyleDefs'
import { getGeoShapePath } from '../getGeoShapePath'

export function GeoShapeBody({
	shape,
	shouldScale,
	forceSolid,
	strokeColor,
	strokeWidth: unscaledStrokeWidth,
	fillColor,
}: {
	shape: TLGeoShape
	shouldScale: boolean
	forceSolid: boolean
	strokeColor: string
	strokeWidth: number
	fillColor: string
}) {
	const scaleToUse = shouldScale ? shape.props.scale : 1
	const strokeWidth = unscaledStrokeWidth * scaleToUse
	const { dash, fill } = shape.props

	const path = getGeoShapePath(shape)
	const fillPath =
		dash === 'draw' && !forceSolid
			? path.toDrawD({ strokeWidth, randomSeed: shape.id, passes: 1, offset: 0, onlyFilled: true })
			: path.toD({ onlyFilled: true })

	return (
		<>
			<GeoFill d={fillPath} fill={fill} fillColor={fillColor} />
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

function GeoFill({
	d,
	fill,
	fillColor,
}: {
	d: string
	fill: TLDefaultFillStyle
	fillColor: string
}) {
	if (fill === 'none') return null
	if (fill === 'pattern') return <GeoPatternFill d={d} fillColor={fillColor} />
	return <path fill={fillColor} d={d} />
}

function GeoPatternFill({ d, fillColor }: { d: string; fillColor: string }) {
	const editor = useEditor()
	const svgExport = useSvgExportContext()
	const zoomLevel = useValue('zoomLevel', () => editor.getEfficientZoomLevel(), [editor])
	const isDarkMode = useIsDarkMode()
	const getHashPatternZoomName = useGetHashPatternZoomName()

	const themeId = isDarkMode ? 'dark' : 'light'
	const teenyTiny = zoomLevel <= 0.18

	return (
		<>
			<path fill={fillColor} d={d} />
			<path
				fill={
					svgExport
						? `url(#${getHashPatternZoomName(1, themeId)})`
						: teenyTiny
							? fillColor
							: `url(#${getHashPatternZoomName(zoomLevel, themeId)})`
				}
				d={d}
			/>
		</>
	)
}
