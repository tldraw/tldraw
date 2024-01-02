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
	TLHandle,
	TLOnBeforeUpdateHandler,
	TLOnHandleChangeHandler,
	TLOnResizeHandler,
	Vec2d,
	deepCopy,
	getDefaultColorTheme,
	resizeBox,
	structuredClone,
} from '@tldraw/tldraw'
import { STROKE_SIZES } from '@tldraw/tldraw/src/lib/shapes/shared/default-shape-constants'
import {
	getHandleIntersectionPoint,
	getHandleinShapeSpace,
	getHandlesInHandleSpace,
	getSpeechBubbleGeometry,
} from './helpers'

// There's a guide at the bottom of this file!

// [1]
export type SpeechBubbleShape = TLBaseShape<
	'speech-bubble',
	{
		w: number
		h: number
		size: TLDefaultSizeStyle
		color: TLDefaultColorStyle
		handles: {
			handle: TLHandle
		}
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
		handles: {
			validate: handleValidator,
			handle: { validate: handleValidator },
		},
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
			handles: {
				handle: {
					id: 'handle1',
					type: 'vertex',
					canBind: true,
					canSnap: true,
					index: 'a1',
					x: 0.5,
					y: 1.5,
				},
			},
		}
	}

	getGeometry(shape: SpeechBubbleShape): Geometry2d {
		const newShape = getHandleinShapeSpace(shape)
		const speechBubbleGeometry = getSpeechBubbleGeometry(newShape)
		const body = new Polygon2d({
			points: speechBubbleGeometry,
			isFilled: true,
		})
		return body
	}

	override getHandles(shape: SpeechBubbleShape) {
		const handles = getHandleinShapeSpace(shape).props.handles
		const handlesArray = Object.values(handles)

		return handlesArray
	}

	// [4]
	override onBeforeUpdate: TLOnBeforeUpdateHandler<SpeechBubbleShape> | undefined = (
		_: SpeechBubbleShape,
		next: SpeechBubbleShape
	) => {
		const shape = getHandleinShapeSpace(next)

		const { originalIntersection: intersection, insideShape } = getHandleIntersectionPoint({
			w: shape.props.w,
			h: shape.props.h,
			handle: shape.props.handles.handle,
		})

		if (!intersection) throw new Error('No intersection')

		const intersectionVector = new Vec2d(intersection.x, intersection.y)
		const handleVector = new Vec2d(shape.props.handles.handle.x, shape.props.handles.handle.y)

		const topLeft = new Vec2d(0, 0)
		const bottomRight = new Vec2d(shape.props.w, shape.props.h)
		const center = new Vec2d(shape.props.w / 2, shape.props.h / 2)
		const MIN_DISTANCE = topLeft.dist(bottomRight) / 5

		const MAX_DISTANCE = topLeft.dist(bottomRight) / 1.5

		const distanceToIntersection = handleVector.dist(intersectionVector)
		const angle = Math.atan2(handleVector.y - center.y, handleVector.x - center.x)
		let newPoint = handleVector

		if (insideShape) {
			const direction = Vec2d.FromAngle(angle, MIN_DISTANCE)
			newPoint = intersectionVector.add(direction)
			shape.props.handles.handle.x = newPoint.x
			shape.props.handles.handle.y = newPoint.y
			return getHandlesInHandleSpace(shape)
		}
		if (distanceToIntersection <= MIN_DISTANCE) {
			const direction = Vec2d.FromAngle(angle, MIN_DISTANCE)
			newPoint = intersectionVector.add(direction)
		}
		if (distanceToIntersection >= MAX_DISTANCE) {
			const direction = Vec2d.FromAngle(angle, MAX_DISTANCE)
			newPoint = intersectionVector.add(direction)
		}

		shape.props.handles.handle.x = newPoint.x
		shape.props.handles.handle.y = newPoint.y
		return getHandlesInHandleSpace(shape)
	}

	override onHandleChange: TLOnHandleChangeHandler<SpeechBubbleShape> = (
		_,
		{ handle, initial }
	) => {
		const newHandle = deepCopy(handle)
		newHandle.x = newHandle.x / initial!.props.w
		newHandle.y = newHandle.y / initial!.props.h
		const next = deepCopy(initial!)
		next.props.handles['handle'] = {
			...next.props.handles['handle'],
			x: newHandle.x,
			y: newHandle.y,
		}

		return next
	}

	component(shape: SpeechBubbleShape) {
		const theme = getDefaultColorTheme({
			isDarkMode: this.editor.user.getIsDarkMode(),
		})
		const newShape = getHandleinShapeSpace(shape)
		const geometry = getSpeechBubbleGeometry(newShape)
		const pathData = 'M' + geometry[0] + 'L' + geometry.slice(1) + 'Z'

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
		const newShape = getHandleinShapeSpace(shape)
		const geometry = getSpeechBubbleGeometry(newShape)
		const pathData = 'M' + geometry[0] + 'L' + geometry.slice(1) + 'Z'
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
of the defauly props.

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
