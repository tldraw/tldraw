import { getColorValue, TLGeoShape, useEditor } from '@tldraw/editor'
import { SizeStyleUtil } from '../../../styles/TLSizeStyle'
import { ShapeFill } from '../../shared/ShapeFill'
import { useDefaultColorTheme } from '../../shared/useDefaultColorTheme'
import { getGeoShapePath } from '../getGeoShapePath'

export function GeoShapeBody({
	shape,
	shouldScale,
	forceSolid,
}: {
	shape: TLGeoShape
	shouldScale: boolean
	forceSolid: boolean
}) {
	const scaleToUse = shouldScale ? shape.props.scale : 1
	const theme = useDefaultColorTheme()
	const { props } = shape
	const { color, fill, dash, size } = props
	const editor = useEditor()
	const strokeWidth = editor.getStyleUtil(SizeStyleUtil).toStrokeSizePx(size) * scaleToUse

	const path = getGeoShapePath(editor, shape)
	const fillPath =
		dash === 'draw' && !forceSolid
			? path.toDrawD({ strokeWidth, randomSeed: shape.id, passes: 1, offset: 0, onlyFilled: true })
			: path.toD({ onlyFilled: true })

	return (
		<>
			<ShapeFill theme={undefined} d={fillPath} color={color} fill={fill} scale={scaleToUse} />
			{path.toSvg({
				style: dash,
				strokeWidth,
				forceSolid,
				randomSeed: shape.id,
				props: { fill: 'none', stroke: getColorValue(theme, color, 'solid') },
			})}
		</>
	)
}
