import {
	Edge2d,
	IndexKey,
	SVGContainer,
	ShapeUtil,
	TLHandle,
	TLHandleDragInfo,
	TLResizeInfo,
	TLRulerShape,
	TLShapePartial,
	Vec,
	getColorValue,
	rulerShapeMigrations,
	rulerShapeProps,
} from '@tldraw/editor'
import { STROKE_SIZES } from '../arrow/shared'
import {
	ARROW_LABEL_FONT_SIZES,
	ARROW_LABEL_PADDING,
	FONT_FAMILIES,
} from '../shared/default-shape-constants'
import { useDefaultColorTheme } from '../shared/useDefaultColorTheme'

/** @public */
export class RulerShapeUtil extends ShapeUtil<TLRulerShape> {
	static override type = 'ruler' as const
	static override props = rulerShapeProps
	static override migrations = rulerShapeMigrations

	override hideResizeHandles() {
		return true
	}
	override hideRotateHandle() {
		return true
	}
	override hideSelectionBoundsFg() {
		return true
	}
	override hideSelectionBoundsBg() {
		return true
	}

	override getDefaultProps(): TLRulerShape['props'] {
		return {
			dash: 'solid',
			size: 'm',
			color: 'black',
			w: 100,
			h: 100,
			scale: 1,
		}
	}

	getGeometry(shape: TLRulerShape) {
		const start = new Vec(0, 0)
		const end = new Vec(shape.props.w, shape.props.h)
		return new Edge2d({
			start,
			end,
		})
	}

	override getHandles(shape: TLRulerShape): TLHandle[] {
		const start = new Vec(0, 0)
		const end = new Vec(shape.props.w, shape.props.h)

		return [
			{
				id: 'start',
				type: 'vertex' as const,
				index: 'a0' as IndexKey,
				x: start.x,
				y: start.y,
				canSnap: true,
			},
			{
				id: 'end',
				type: 'vertex' as const,
				index: 'a1' as IndexKey,
				x: end.x,
				y: end.y,
				canSnap: true,
			},
		]
	}

	override onResize(shape: TLRulerShape, info: TLResizeInfo<TLRulerShape>) {
		const { scaleX, scaleY } = info
		return {
			props: {
				w: shape.props.w * scaleX,
				h: shape.props.h * scaleY,
			},
		}
	}

	override onHandleDrag(
		shape: TLRulerShape,
		{ handle }: TLHandleDragInfo<TLRulerShape>
	): TLShapePartial<TLRulerShape> {
		const { x, y } = handle

		if (handle.id === 'start') {
			// When dragging start, adjust position and dimensions
			return {
				...shape,
				x: shape.x + x,
				y: shape.y + y,
				props: {
					...shape.props,
					w: shape.props.w - x,
					h: shape.props.h - y,
				},
			}
		}

		if (handle.id === 'end') {
			// When dragging end, just adjust dimensions
			return {
				...shape,
				props: {
					...shape.props,
					w: x,
					h: y,
				},
			}
		}

		return shape
	}

	component(shape: TLRulerShape) {
		return (
			<SVGContainer style={{ minWidth: 50, minHeight: 50 }}>
				<RulerShapeSvg shape={shape} />
			</SVGContainer>
		)
	}

	indicator(shape: TLRulerShape) {
		const strokeWidth = (STROKE_SIZES[shape.props.size] * shape.props.scale) / 3
		const start = new Vec(0, 0)
		const end = new Vec(shape.props.w, shape.props.h)

		return (
			<line
				x1={start.x}
				y1={start.y}
				x2={end.x}
				y2={end.y}
				strokeWidth={strokeWidth}
				stroke="currentColor"
				fill="none"
			/>
		)
	}

	override toSvg(shape: TLRulerShape) {
		return <RulerShapeSvg shouldScale shape={shape} />
	}
}

function RulerShapeSvg({
	shape,
	shouldScale = false,
}: {
	shape: TLRulerShape
	shouldScale?: boolean
}) {
	const theme = useDefaultColorTheme()
	const { dash, color, size, w, h } = shape.props

	const start = new Vec(0, 0)
	const end = new Vec(w, h)
	const distance = Vec.Dist(start, end)
	const midpoint = Vec.Lrp(start, end, 0.5)

	// Use thinner stroke width for ruler - 1/3 of normal stroke sizes
	const strokeWidth = (STROKE_SIZES[size] * shape.props.scale) / 3
	const scaleFactor = 1 / shape.props.scale
	const scale = shouldScale ? scaleFactor : 1

	// Format distance to 1 decimal place
	const formattedDistance = `${distance.toFixed(1)}`

	// Calculate angle for label rotation
	const angle = Vec.Angle(start, end)

	// Use smaller font size for ruler - 2/3 of normal arrow label sizes
	const fontSize = (ARROW_LABEL_FONT_SIZES[size] * shape.props.scale * 2) / 6

	// Calculate text width based on character count
	const textWidth = formattedDistance.length * fontSize * 0.6
	const rectWidth = textWidth + ARROW_LABEL_PADDING * 1.5

	// Dash array for different styles
	const getDashArray = () => {
		const baseSize = strokeWidth * 3
		switch (dash) {
			case 'dashed':
				return `${baseSize * 2} ${baseSize}`
			case 'dotted':
				return `${strokeWidth} ${baseSize}`
			case 'solid':
			default:
				return 'none'
		}
	}

	return (
		<g transform={`scale(${scale})`}>
			{/* Main line */}
			<line
				x1={start.x}
				y1={start.y}
				x2={end.x}
				y2={end.y}
				stroke={getColorValue(theme, color, 'solid')}
				strokeWidth={strokeWidth}
				strokeDasharray={getDashArray()}
				fill="none"
			/>

			{/* Endpoint circles */}
			<circle
				cx={start.x}
				cy={start.y}
				r={strokeWidth * 2}
				fill={getColorValue(theme, color, 'solid')}
			/>
			<circle
				cx={end.x}
				cy={end.y}
				r={strokeWidth * 2}
				fill={getColorValue(theme, color, 'solid')}
			/>

			{/* Measurement label - drawn after line for higher z-order */}
			<g transform={`translate(${midpoint.x}, ${midpoint.y}) rotate(${(angle * 180) / Math.PI})`}>
				{/* Background rectangle for text - centered over the line */}
				<rect
					x={-rectWidth / 2}
					y={-fontSize / 2 - ARROW_LABEL_PADDING / 2}
					width={rectWidth}
					height={fontSize + ARROW_LABEL_PADDING}
					fill="#e5e5e5"
					stroke={getColorValue(theme, color, 'solid')}
					strokeWidth={strokeWidth}
					rx={3}
				/>
				{/* Text label */}
				<text
					x={0}
					y={0}
					fontSize={fontSize}
					fill={getColorValue(theme, color, 'solid')}
					textAnchor="middle"
					dominantBaseline="middle"
					fontFamily={FONT_FAMILIES.sans}
					fontWeight="normal"
				>
					{formattedDistance}
				</text>
			</g>
		</g>
	)
}
