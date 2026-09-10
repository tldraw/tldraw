import {
	DefaultColorStyle,
	DefaultFontStyle,
	DefaultHorizontalAlignStyle,
	DefaultSizeStyle,
	DefaultVerticalAlignStyle,
	Geometry2d,
	PlainTextLabel,
	Polygon2d,
	RecordPropsType,
	ShapeUtil,
	T,
	TLDefaultSizeStyle,
	TLHandle,
	TLHandleDragInfo,
	TLResizeInfo,
	TLShape,
	Vec,
	ZERO_INDEX_KEY,
	getColorValue,
	getFontFamily,
	resizeBox,
	structuredClone,
	vecModelValidator,
} from 'tldraw'
import { getSpeechBubbleVertices, getTailIntersectionPoint } from './helpers'

const LABEL_FONT_SIZES: Record<TLDefaultSizeStyle, number> = {
	s: 1.125,
	m: 1.375,
	l: 1.625,
	xl: 2,
}

const TEXT_PROPS = {
	fontWeight: 'normal',
	fontVariant: 'normal',
	fontStyle: 'normal',
	padding: '0px',
}

const SPEECH_BUBBLE_TYPE = 'speech-bubble'

// [1]
declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[SPEECH_BUBBLE_TYPE]: SpeechBubbleShapeProps
	}
}

// Stroke width multipliers per size, applied to the theme's base stroke width
const STROKE_SIZES: Record<TLDefaultSizeStyle, number> = {
	s: 1,
	m: 1.75,
	l: 2.5,
	xl: 5,
}

// There's a guide at the bottom of this file!

export const speechBubbleShapeProps = {
	w: T.number,
	h: T.number,
	size: DefaultSizeStyle,
	color: DefaultColorStyle,
	font: DefaultFontStyle,
	align: DefaultHorizontalAlignStyle,
	verticalAlign: DefaultVerticalAlignStyle,
	growY: T.positiveNumber,
	text: T.string,
	tail: vecModelValidator,
}

export type SpeechBubbleShapeProps = RecordPropsType<typeof speechBubbleShapeProps>
// [2]
export type SpeechBubbleShape = TLShape<typeof SPEECH_BUBBLE_TYPE>

export class SpeechBubbleUtil extends ShapeUtil<SpeechBubbleShape> {
	static override type = SPEECH_BUBBLE_TYPE

	// [3]
	static override props = speechBubbleShapeProps

	override canEdit(shape: SpeechBubbleShape) {
		return true
	}

	// [4]
	getDefaultProps(): SpeechBubbleShapeProps {
		return {
			w: 200,
			h: 130,
			color: 'black',
			size: 'm',
			font: 'draw',
			align: 'middle',
			verticalAlign: 'start',
			growY: 0,
			text: '',
			tail: { x: 0.5, y: 1.5 },
		}
	}

	getHeight(shape: SpeechBubbleShape) {
		return shape.props.h + shape.props.growY
	}

	getGeometry(shape: SpeechBubbleShape): Geometry2d {
		const speechBubbleGeometry = getSpeechBubbleVertices(shape)
		const body = new Polygon2d({
			points: speechBubbleGeometry,
			isFilled: true,
		})
		return body
	}

	// [5]
	override getHandles(shape: SpeechBubbleShape): TLHandle[] {
		const { tail, w } = shape.props

		return [
			{
				id: 'tail',
				type: 'vertex',
				label: 'Move tail',
				index: ZERO_INDEX_KEY,
				// props.tail coordinates are normalized
				// but here we need them in shape space
				x: tail.x * w,
				y: tail.y * this.getHeight(shape),
			},
		]
	}

	override onHandleDrag(shape: SpeechBubbleShape, { handle }: TLHandleDragInfo<SpeechBubbleShape>) {
		return {
			...shape,
			props: {
				tail: {
					x: handle.x / shape.props.w,
					y: handle.y / this.getHeight(shape),
				},
			},
		}
	}

	override onBeforeCreate(next: SpeechBubbleShape) {
		return this.getGrowY(next, next.props.growY)
	}

	// [6]
	override onBeforeUpdate(prev: SpeechBubbleShape, shape: SpeechBubbleShape) {
		const { w, tail } = shape.props
		const fullHeight = this.getHeight(shape)

		const { segmentsIntersection, insideShape } = getTailIntersectionPoint(shape)

		const slantedLength = Math.hypot(w, fullHeight)
		const MIN_DISTANCE = slantedLength / 5
		const MAX_DISTANCE = slantedLength / 1.5

		const tailInShapeSpace = new Vec(tail.x * w, tail.y * fullHeight)

		const distanceToIntersection = tailInShapeSpace.dist(segmentsIntersection)
		const center = new Vec(w / 2, fullHeight / 2)
		const tailDirection = Vec.Sub(tailInShapeSpace, center).uni()

		let newPoint = tailInShapeSpace

		if (insideShape) {
			newPoint = Vec.Add(segmentsIntersection, tailDirection.mul(MIN_DISTANCE))
		} else {
			if (distanceToIntersection <= MIN_DISTANCE) {
				newPoint = Vec.Add(segmentsIntersection, tailDirection.mul(MIN_DISTANCE))
			} else if (distanceToIntersection >= MAX_DISTANCE) {
				newPoint = Vec.Add(segmentsIntersection, tailDirection.mul(MAX_DISTANCE))
			}
		}

		const next = structuredClone(shape)
		next.props.tail.x = newPoint.x / w
		next.props.tail.y = newPoint.y / fullHeight

		return this.getGrowY(next, prev.props.growY)
	}

	component(shape: SpeechBubbleShape) {
		const {
			id,
			type,
			props: { color, font, size, align, text },
		} = shape
		const vertices = getSpeechBubbleVertices(shape)
		const pathData = 'M' + vertices[0] + 'L' + vertices.slice(1) + 'Z'
		const isSelected = shape.id === this.editor.getOnlySelectedShapeId()
		const theme = this.editor.getCurrentTheme()
		const colors = theme.colors[this.editor.getColorMode()]

		return (
			<>
				<svg className="tl-svg-container">
					<path
						d={pathData}
						strokeWidth={theme.strokeWidth * STROKE_SIZES[size]}
						stroke={getColorValue(colors, color, 'solid')}
						fill={'none'}
					/>
				</svg>
				<PlainTextLabel
					shapeId={id}
					type={type}
					fontFamily={getFontFamily(theme, font)}
					textWidth={shape.props.w}
					fontSize={theme.fontSize * LABEL_FONT_SIZES[size]}
					lineHeight={theme.lineHeight}
					textAlign={align as 'start' | 'center' | 'end'}
					verticalAlign="start"
					text={text}
					labelColor={getColorValue(colors, color, 'solid')}
					isSelected={isSelected}
					wrap
				/>
			</>
		)
	}

	getIndicatorPath(shape: SpeechBubbleShape) {
		const vertices = getSpeechBubbleVertices(shape)
		const pathData = 'M' + vertices[0] + 'L' + vertices.slice(1) + 'Z'
		return new Path2D(pathData)
	}

	override onResize(shape: SpeechBubbleShape, info: TLResizeInfo<SpeechBubbleShape>) {
		return resizeBox(shape, info)
	}

	getGrowY(shape: SpeechBubbleShape, prevGrowY = 0) {
		const PADDING = 17

		const theme = this.editor.getCurrentTheme()
		const nextTextSize = this.editor.textMeasure.measureText(shape.props.text, {
			...TEXT_PROPS,
			lineHeight: theme.lineHeight,
			fontFamily: getFontFamily(theme, shape.props.font),
			fontSize: theme.fontSize * LABEL_FONT_SIZES[shape.props.size],
			maxWidth: shape.props.w - PADDING * 2,
		})

		const nextHeight = nextTextSize.h + PADDING * 2

		let growY = 0

		if (nextHeight > shape.props.h) {
			growY = nextHeight - shape.props.h
		} else {
			if (prevGrowY) {
				growY = 0
			}
		}

		return {
			...shape,
			props: {
				...shape.props,
				growY,
			},
		}
	}
}

/*
This file contains the speech bubble shape util. Most of the logic that makes the tail behave
lives in the onBeforeUpdate handler [6]: because the tail is driven by a handle, we constrain it
there so every way of changing the shape (dragging the handle, resizing, editing text) keeps the
tail in a sensible place.

[1]
Extend TLGlobalShapePropsMap to add our shape's props to the global type system. The tail is a
VecModel.

[2]
Define the shape type using TLShape with the shape's type as a type argument.

[3]
The shape's props with a validator for each key. Using tldraw's StyleProps (DefaultSizeStyle,
DefaultColorStyle, DefaultFontStyle, and the align styles) here is what makes those options show
up in the style panel for this shape; add 'dash' or 'fill' the same way if you want them.

[4]
Default props. The tail is stored as a fraction of the shape's width and height rather than in
pixels, so it scales correctly when the shape is drag-created or resized. The rest of the util
converts between the normalized tail and shape space as needed.

[5]
`getHandles` returns the handles to show when the shape is selected: just the tail here. Handle
positions are in shape space, so we scale the normalized tail up. `onHandleDrag` does the reverse
when the handle moves.

[6]
onBeforeUpdate runs on every change to the shape. We use it to keep the tail at a sensible
distance from the body: pushed outside if it was dragged inside, and clamped between a minimum
and maximum length. It also recomputes `growY` so the body grows to fit the text. See helpers.tsx
for the geometry.
*/
