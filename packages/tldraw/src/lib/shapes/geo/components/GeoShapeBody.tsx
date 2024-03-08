import { Group2d, TLGeoShape, useEditor } from '@tldraw/editor'
import { STROKE_SIZES } from '../../shared/default-shape-constants'
import { getLines } from '../getLines'
import { DashStyleCloud } from './DashStyleCloud'
import { DashStyleEllipse } from './DashStyleEllipse'
import { DashStyleOval } from './DashStyleOval'
import { DashStylePolygon } from './DashStylePolygon'
import { DrawStyleCloud } from './DrawStyleCloud'
import { DrawStylePolygon } from './DrawStylePolygon'
import { SolidStyleCloud } from './SolidStyleCloud'
import { SolidStyleEllipse } from './SolidStyleEllipse'
import { SolidStyleOval } from './SolidStyleOval'
import { SolidStylePolygon } from './SolidStylePolygon'

export function GeoShapeBody({ shape }: { shape: TLGeoShape }) {
	const editor = useEditor()
	const { id, props } = shape
	const { w, color, fill, dash, growY, size } = props
	const strokeWidth = STROKE_SIZES[size]
	const h = props.h + growY

	switch (props.geo) {
		case 'cloud': {
			if (dash === 'solid') {
				return (
					<SolidStyleCloud
						color={color}
						fill={fill}
						strokeWidth={strokeWidth}
						w={w}
						h={h}
						id={id}
						size={size}
					/>
				)
			} else if (dash === 'dashed' || dash === 'dotted') {
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
			} else if (dash === 'draw') {
				return (
					<DrawStyleCloud
						color={color}
						fill={fill}
						strokeWidth={strokeWidth}
						w={w}
						h={h}
						id={id}
						size={size}
					/>
				)
			}

			break
		}
		case 'ellipse': {
			if (dash === 'solid') {
				return <SolidStyleEllipse strokeWidth={strokeWidth} w={w} h={h} color={color} fill={fill} />
			} else if (dash === 'dashed' || dash === 'dotted') {
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
			} else if (dash === 'draw') {
				return <SolidStyleEllipse strokeWidth={strokeWidth} w={w} h={h} color={color} fill={fill} />
			}
			break
		}
		case 'oval': {
			if (dash === 'solid') {
				return <SolidStyleOval strokeWidth={strokeWidth} w={w} h={h} color={color} fill={fill} />
			} else if (dash === 'dashed' || dash === 'dotted') {
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
			} else if (dash === 'draw') {
				return <SolidStyleOval strokeWidth={strokeWidth} w={w} h={h} color={color} fill={fill} />
			}
			break
		}
		default: {
			const geometry = editor.getShapeGeometry(shape)
			const outline =
				geometry instanceof Group2d ? geometry.children[0].vertices : geometry.vertices
			const lines = getLines(shape.props, strokeWidth)

			if (dash === 'solid') {
				return (
					<SolidStylePolygon
						fill={fill}
						color={color}
						strokeWidth={strokeWidth}
						outline={outline}
						lines={lines}
					/>
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
