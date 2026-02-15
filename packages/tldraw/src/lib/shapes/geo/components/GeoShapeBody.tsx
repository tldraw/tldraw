import { TLGeoShape, useEditor } from '@tldraw/editor'
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
	const editor = useEditor()
	const theme = useDefaultColorTheme()
	const styles = editor.getShapeStyles(shape)
	const { props } = shape
	const { fill, dash } = props
	const strokeWidth = styles.strokeWidth * scaleToUse

	const path = getGeoShapePath(shape)
	const fillPath =
		dash === 'draw' && !forceSolid
			? path.toDrawD({ strokeWidth, randomSeed: shape.id, passes: 1, offset: 0, onlyFilled: true })
			: path.toD({ onlyFilled: true })

	return (
		<>
			<ShapeFill theme={theme} d={fillPath} fillColors={styles} fill={fill} scale={scaleToUse} />
			{path.toSvg({
				style: dash,
				strokeWidth,
				forceSolid,
				randomSeed: shape.id,
				props: { fill: 'none', stroke: styles.strokeColor },
			})}
		</>
	)
}
