import { Group2d, TLGeoShape, useEditor } from '@tldraw/editor'
import { ShapeFill, useDefaultColorTheme } from '../../shared/ShapeFill'
import { STROKE_SIZES } from '../../shared/default-shape-constants'
import { getCloudPath, getHeartPath, inkyCloudSvgPath } from '../geo-shape-helpers'
import { getLines } from '../getLines'
import { DashStyleCloud } from './DashStyleCloud'
import { DashStyleEllipse } from './DashStyleEllipse'
import { DashStyleHeart } from './DashStyleHeart'
import { DashStyleOval } from './DashStyleOval'
import { DashStylePolygon } from './DashStylePolygon'
import { DrawStylePolygon } from './DrawStylePolygon'

export function GeoShapeBody({ shape }: { shape: TLGeoShape }) {
	const editor = useEditor()
	const theme = useDefaultColorTheme()
	const { id, props } = shape
	const { w, color, fill, dash, growY, size } = props
	const strokeWidth = STROKE_SIZES[size]
	const h = props.h + growY

	switch (props.geo) {
		case 'cloud': {
			if (dash === 'solid') {
				const d = getCloudPath(w, h, id, size)
				return (
					<>
						<ShapeFill d={d} color={color} fill={fill} theme={theme} />
						<path d={d} stroke={theme[color].solid} strokeWidth={strokeWidth} fill="none" />
					</>
				)
			} else if (dash === 'draw') {
				const d = inkyCloudSvgPath(w, h, id, size)
				return (
					<>
						<ShapeFill theme={theme} d={d} fill={fill} color={color} />
						<path d={d} stroke={theme[color].solid} strokeWidth={strokeWidth} fill="none" />
					</>
				)
			} else {
				return (
					<DashStyleCloud
						color={color}
						fill={fill}
						strokeWidth={strokeWidth}
						w={w}
						h={h}
						id={id}
						size={size}
						dash={dash}
					/>
				)
			}

			break
		}
		case 'ellipse': {
			if (dash === 'dashed' || dash === 'dotted') {
				return (
					<DashStyleEllipse
						id={id}
						strokeWidth={strokeWidth}
						w={w}
						h={h}
						dash={dash}
						color={color}
						fill={fill}
					/>
				)
			} else {
				const geometry = editor.getShapeGeometry(shape)
				const d = geometry.getSvgPathData(true)
				return (
					<>
						<ShapeFill d={d} color={color} fill={fill} theme={theme} />
						<path d={d} stroke={theme[color].solid} strokeWidth={strokeWidth} fill="none" />
					</>
				)
			}
		}
		case 'oval': {
			const geometry = editor.getShapeGeometry(shape)
			const d = geometry.getSvgPathData(true)
			if (dash === 'dashed' || dash === 'dotted') {
				return (
					<DashStyleOval
						id={id}
						strokeWidth={strokeWidth}
						w={w}
						h={h}
						dash={dash}
						color={color}
						fill={fill}
					/>
				)
			} else {
				return (
					<>
						<ShapeFill d={d} color={color} fill={fill} theme={theme} />
						<path d={d} stroke={theme[color].solid} strokeWidth={strokeWidth} fill="none" />
					</>
				)
			}
		}
		case 'heart': {
			if (dash === 'dashed' || dash === 'dotted') {
				return (
					<DashStyleHeart
						id={id}
						strokeWidth={strokeWidth}
						w={w}
						h={h}
						dash={dash}
						color={color}
						fill={fill}
					/>
				)
			} else if (dash === 'draw') {
				const d = getHeartPath(w, h)
				return (
					<>
						<ShapeFill d={d} color={color} fill={fill} theme={theme} />
						<path d={d} stroke={theme[color].solid} strokeWidth={strokeWidth} fill="none" />
					</>
				)
			}
			break
		}
		default: {
			const geometry = editor.getShapeGeometry(shape)
			const outline =
				geometry instanceof Group2d ? geometry.children[0].vertices : geometry.vertices
			const lines = getLines(shape.props, strokeWidth)

			if (dash === 'solid') {
				let path = 'M' + outline[0] + 'L' + outline.slice(1) + 'Z'

				if (lines) {
					for (const [A, B] of lines) {
						path += `M${A.x},${A.y}L${B.x},${B.y}`
					}
				}

				return (
					<>
						<ShapeFill d={path} fill={fill} color={color} theme={theme} />
						<path d={path} stroke={theme[color].solid} strokeWidth={strokeWidth} fill="none" />
					</>
				)
			} else if (dash === 'dashed' || dash === 'dotted') {
				return (
					<DashStylePolygon
						dash={dash}
						fill={fill}
						color={color}
						strokeWidth={strokeWidth}
						outline={outline}
						lines={lines}
					/>
				)
			} else if (dash === 'draw') {
				return (
					<DrawStylePolygon
						id={id}
						fill={fill}
						color={color}
						strokeWidth={strokeWidth}
						outline={outline}
						lines={lines}
					/>
				)
			}
		}
	}
}
