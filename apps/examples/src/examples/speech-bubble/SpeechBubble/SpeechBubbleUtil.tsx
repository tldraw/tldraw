import {
	DefaultColorStyle,
	DefaultFontStyle,
	DefaultHorizontalAlignStyle,
	DefaultSizeStyle,
	DefaultVerticalAlignStyle,
	Geometry2d,
	Polygon2d,
	ShapeUtil,
	T,
	TLBaseShape,
	TLHandle,
	TLOnBeforeUpdateHandler,
	TLOnHandleDragHandler,
	TLOnResizeHandler,
	TextLabel,
	Vec,
	ZERO_INDEX_KEY,
	deepCopy,
	getDefaultColorTheme,
	resizeBox,
	structuredClone,
} from '@tldraw/tldraw'
import { ShapePropsType } from '@tldraw/tlschema/src/shapes/TLBaseShape'
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
export const handleValidator = () => true

export const speechBubbleShapeProps = {
	w: T.number,
	h: T.number,
	size: DefaultSizeStyle,
	color: DefaultColorStyle,
	font: DefaultFontStyle,
	align: DefaultHorizontalAlignStyle,
	verticalAlign: DefaultVerticalAlignStyle,
	text: T.string,
	handles: {
		validate: handleValidator,
		handle: { validate: handleValidator },
	},
}

export type SpeechBubbleShapeProps = Omit<
	ShapePropsType<typeof speechBubbleShapeProps>,
	'handles'
> & {
	handles: {
		handle: TLHandle
	}
}
export type SpeechBubbleShape = TLBaseShape<'speech-bubble', SpeechBubbleShapeProps>

export class SpeechBubbleUtil extends ShapeUtil<SpeechBubbleShape> {
	static override type = 'speech-bubble' as const

	// [2]
	static override props = speechBubbleShapeProps

	override isAspectRatioLocked = (_shape: SpeechBubbleShape) => false

	override canResize = (_shape: SpeechBubbleShape) => true

	override canBind = (_shape: SpeechBubbleShape) => true

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
			text: '',
			handles: {
				handle: {
					id: 'handle1',
					type: 'vertex',
					canBind: true,
					canSnap: true,
					index: ZERO_INDEX_KEY,
					x: 0.5,
					y: 1.5,
				},
			},
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

	override getHandles(shape: SpeechBubbleShape) {
		const {
			handles: { handle },
			w,
			h,
		} = shape.props

		return [
			{
				...handle,
				// props.handles.handle coordinates are normalized
				// but here we need them in shape space
				x: handle.x * w,
				y: handle.y * h,
			},
		]
	}

	// [4]
	override onBeforeUpdate: TLOnBeforeUpdateHandler<SpeechBubbleShape> | undefined = (
		_: SpeechBubbleShape,
		shape: SpeechBubbleShape
	) => {
		const { w, h, handles } = shape.props

		const { segmentsIntersection, insideShape } = getHandleIntersectionPoint(shape)

		const slantedLength = Math.hypot(w, h)
		const MIN_DISTANCE = slantedLength / 5
		const MAX_DISTANCE = slantedLength / 1.5

		const handleInShapeSpace = new Vec(handles.handle.x * w, handles.handle.y * h)

		const distanceToIntersection = handleInShapeSpace.dist(segmentsIntersection)
		const center = new Vec(w / 2, h / 2)
		const vHandle = Vec.Sub(handleInShapeSpace, center).uni()

		let newPoint = handleInShapeSpace

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
		next.props.handles.handle.x = newPoint.x / w
		next.props.handles.handle.y = newPoint.y / h

		return next
	}

	override onHandleDrag: TLOnHandleDragHandler<SpeechBubbleShape> = (_, { handle, initial }) => {
		const newHandle = deepCopy(handle)
		newHandle.x = newHandle.x / initial!.props.w
		newHandle.y = newHandle.y / initial!.props.h
		const next = deepCopy(initial!)
		next.props.handles.handle = newHandle

		return next
	}

	component(shape: SpeechBubbleShape) {
		const {
			id,
			type,
			props: { color, font, size, align, text },
		} = shape
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
						strokeWidth={STROKE_SIZES[size]}
						stroke={theme[color].solid}
						fill={'none'}
					/>
				</svg>

				<TextLabel
					id={id}
					type={type}
					font={font}
					size={size}
					align={align}
					verticalAlign="start"
					text={text}
					labelColor="black"
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
