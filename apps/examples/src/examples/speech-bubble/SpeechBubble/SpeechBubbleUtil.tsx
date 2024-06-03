import {
	DefaultColorStyle,
	DefaultFontStyle,
	DefaultHorizontalAlignStyle,
	DefaultSizeStyle,
	DefaultVerticalAlignStyle,
	FONT_FAMILIES,
	Geometry2d,
	LABEL_FONT_SIZES,
	Polygon2d,
	RecordPropsType,
	ShapeUtil,
	T,
	TEXT_PROPS,
	TLBaseShape,
	TLHandle,
	TLOnBeforeUpdateHandler,
	TLOnHandleDragHandler,
	TLOnResizeHandler,
	TextLabel,
	Vec,
	ZERO_INDEX_KEY,
	resizeBox,
	structuredClone,
	useDefaultColorTheme,
	vecModelValidator,
} from 'tldraw'
import { getSpeechBubbleVertices, getTailIntersectionPoint } from './helpers'

// Copied from tldraw/tldraw
export const STROKE_SIZES = {
	s: 2,
	m: 3.5,
	l: 5,
	xl: 10,
}

// There's a guide at the bottom of this file!

// [1]

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
export type SpeechBubbleShape = TLBaseShape<'speech-bubble', SpeechBubbleShapeProps>

export class SpeechBubbleUtil extends ShapeUtil<SpeechBubbleShape> {
	static override type = 'speech-bubble' as const

	// [2]
	static override props = speechBubbleShapeProps

	override isAspectRatioLocked = (_shape: SpeechBubbleShape) => false

	override canResize = (_shape: SpeechBubbleShape) => true

	override canEdit = () => true

	// [3]
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

	// [4]
	override getHandles(shape: SpeechBubbleShape): TLHandle[] {
		const { tail, w } = shape.props

		return [
			{
				id: 'tail',
				type: 'vertex',
				index: ZERO_INDEX_KEY,
				// props.tail coordinates are normalized
				// but here we need them in shape space
				x: tail.x * w,
				y: tail.y * this.getHeight(shape),
			},
		]
	}

	override onHandleDrag: TLOnHandleDragHandler<SpeechBubbleShape> = (shape, { handle }) => {
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

	override onBeforeCreate = (next: SpeechBubbleShape) => {
		return this.getGrowY(next, next.props.growY)
	}

	// [5]
	override onBeforeUpdate: TLOnBeforeUpdateHandler<SpeechBubbleShape> | undefined = (
		prev: SpeechBubbleShape,
		shape: SpeechBubbleShape
	) => {
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
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const theme = useDefaultColorTheme()

		return (
			<>
				<svg className="tl-svg-container">
					<path
						d={pathData}
						strokeWidth={STROKE_SIZES[size]}
						stroke={theme[color].solid}
						fill={'none'}
					/>
				</svg>
				<TextLabel
					id={id}
					type={type}
					font={font}
					fontSize={LABEL_FONT_SIZES[size]}
					lineHeight={TEXT_PROPS.lineHeight}
					align={align}
					verticalAlign="start"
					text={text}
					labelColor={theme[color].solid}
					isSelected={isSelected}
					wrap
				/>
			</>
		)
	}

	indicator(shape: SpeechBubbleShape) {
		const vertices = getSpeechBubbleVertices(shape)
		const pathData = 'M' + vertices[0] + 'L' + vertices.slice(1) + 'Z'
		return <path d={pathData} />
	}

	override onResize: TLOnResizeHandler<SpeechBubbleShape> = (shape, info) => {
		const resized = resizeBox(shape, info)
		const next = structuredClone(info.initialShape)
		next.x = resized.x
		next.y = resized.y
		next.props.w = resized.props.w
		next.props.h = resized.props.h
		return next
	}

	getGrowY(shape: SpeechBubbleShape, prevGrowY = 0) {
		const PADDING = 17

		const nextTextSize = this.editor.textMeasure.measureText(shape.props.text, {
			...TEXT_PROPS,
			fontFamily: FONT_FAMILIES[shape.props.font],
			fontSize: LABEL_FONT_SIZES[shape.props.size],
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
Introduction: This file contains our custom shape util. The shape util is a class that defines how
our shape behaves. Most of the logic for how the speech bubble shape works is in the onBeforeUpdate
handler [5]. Since this shape has a handle, we need to do some special stuff to make sure it updates
the way we want it to.

[1]
Here is where we define the shape's type. For the tail we can use the `VecModel` type from `tldraw`.

[2]
This is where we define the shape's props and a type validator for each key. tldraw exports a
bunch of handy validators for us to use. Props you define here will determine which style options
show up in the style menu, e.g. we define 'size' and 'color' props, but we could add 'dash', 'fill'
or any other of the default props.

[3]
Here is where we set the default props for our shape, this will determine how the shape looks
when we click-create it. You'll notice we don't store the tail's absolute position though, instead
we record its relative position. This is because we can also drag-create shapes. If we store the
tail's position absolutely it won't scale properly when drag-creating. Throughout the rest of the
util we'll need to convert the tail's relative position to an absolute position and vice versa.

[4]
`getHandles` tells tldraw how to turn our shape into a list of handles that'll show up when it's
selected. We only have one handle, the tail, which simplifies things for us a bit. In
`onHandleDrag`, we tell tldraw how our shape should be updated when the handle is dragged.

[5]
This is the last method that fires after a shape has been changed, we can use it to make sure
the tail stays the right length and position. Check out helpers.tsx to get into some of the more
specific geometry stuff.
*/
