import {
	DefaultColorStyle,
	DefaultSizeStyle,
	Geometry2d,
	Polygon2d,
	ShapeUtil,
	T,
	TLBaseShape,
	TLDefaultColorStyle,
	TLDefaultSizeStyle,
	TLOnBeforeUpdateHandler,
	TLOnResizeHandler,
	Vec,
	VecModel,
	deepCopy,
	getDefaultColorTheme,
	resizeBox,
	structuredClone,
	vecModelValidator,
} from '@tldraw/tldraw'
import { getHandleIntersectionPoint, getSpeechBubbleVertices } from './helpers'

// Copied from tldraw/tldraw
export const STROKE_SIZES = {
	s: 2,
	m: 3.5,
	l: 5,
	xl: 10,
}

// There's a guide at the bottom of this file!

// [1]
export type SpeechBubbleShape = TLBaseShape<
	'speech-bubble',
	{
		w: number
		h: number
		size: TLDefaultSizeStyle
		color: TLDefaultColorStyle
		tail: VecModel
	}
>

export const handleValidator = () => true

export class SpeechBubbleUtil extends ShapeUtil<SpeechBubbleShape> {
	static override type = 'speech-bubble' as const

	// [2]
	static override props = {
		w: T.number,
		h: T.number,
		size: DefaultSizeStyle,
		color: DefaultColorStyle,
		tail: vecModelValidator,
	}

	override isAspectRatioLocked = (_shape: SpeechBubbleShape) => false

	override canResize = (_shape: SpeechBubbleShape) => true

	override canBind = (_shape: SpeechBubbleShape) => true

	// [3]
	getDefaultProps(): SpeechBubbleShape['props'] {
		return {
			w: 200,
			h: 130,
			color: 'black',
			size: 'm',
			tail: { x: 0.5, y: 1.5 },
		}
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
	override onBeforeUpdate: TLOnBeforeUpdateHandler<SpeechBubbleShape> | undefined = (
		_: SpeechBubbleShape,
		shape: SpeechBubbleShape
	) => {
		const { w, h, tail } = shape.props

		const { segmentsIntersection, insideShape } = getHandleIntersectionPoint(shape)

		const slantedLength = Math.hypot(w, h)
		const MIN_DISTANCE = slantedLength / 5
		const MAX_DISTANCE = slantedLength / 1.5

		const tailInShapeSpace = new Vec(tail.x * w, tail.y * h)

		const distanceToIntersection = tailInShapeSpace.dist(segmentsIntersection)
		const center = new Vec(w / 2, h / 2)
		const vHandle = Vec.Sub(tailInShapeSpace, center).uni()

		let newPoint = tailInShapeSpace

		if (insideShape) {
			newPoint = Vec.Add(segmentsIntersection, vHandle.mul(MIN_DISTANCE))
		} else {
			if (distanceToIntersection <= MIN_DISTANCE) {
				newPoint = Vec.Add(segmentsIntersection, vHandle.mul(MIN_DISTANCE))
			} else if (distanceToIntersection >= MAX_DISTANCE) {
				newPoint = Vec.Add(segmentsIntersection, vHandle.mul(MAX_DISTANCE))
			}
		}

		const next = deepCopy(shape)
		next.props.tail.x = newPoint.x / w
		next.props.tail.y = newPoint.y / h

		return next
	}

	component(shape: SpeechBubbleShape) {
		const theme = getDefaultColorTheme({
			isDarkMode: this.editor.user.getIsDarkMode(),
		})
		const vertices = getSpeechBubbleVertices(shape)
		const pathData = 'M' + vertices[0] + 'L' + vertices.slice(1) + 'Z'

		return (
			<>
				<svg className="tl-svg-container">
					<path
						d={pathData}
						strokeWidth={STROKE_SIZES[shape.props.size]}
						stroke={theme[shape.props.color].solid}
						fill={'none'}
					/>
				</svg>
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
}

/*
Introduction:
This file contains our custom shape util. The shape util is a class that defines how our shape behaves.
Most of the logic for how the speech bubble shape works is in the onBeforeUpdate handler [4]. Since this
shape has a handle, we need to do some special stuff to make sure it updates the way we want it to.

[1]
Here is where we define the shape's type. For the handle we can use the `TLHandle` type from @tldraw/tldraw.

[2]
This is where we define the shape's props and a type validator for each key. tldraw exports a bunch of handy
validators for us to use. We can also define our own, at the moment our handle validator just returns true 
though, because I like to live dangerously. Props you define here will determine which style options show 
up in the style menu, e.g. we define 'size' and 'color' props, but we could add 'dash', 'fill' or any other
of the default props.

[3]
Here is where we set the default props for our shape, this will determine how the shape looks when we
click-create it. You'll notice we don't store the handle's absolute position though, instead we record its 
relative position. This is because we can also drag-create shapes. If we store the handle's position absolutely 
it won't scale properly when drag-creating. Throughout the rest of the util we'll need to convert the
handle's relative position to an absolute position and vice versa.

[4]
This is the last method that fires  after a shape has been changed, we can use it to make sure the tail stays
the right length and position. Check out helpers.tsx to get into some of the more specific geometry stuff.

*/
