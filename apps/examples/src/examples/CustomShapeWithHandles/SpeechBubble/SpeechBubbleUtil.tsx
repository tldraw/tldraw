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
import { getHandleIntersectionPoint, getSpeechBubbleGeometry } from './helpers'

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

export const getHandleinShapeSpace = (shape: SpeechBubbleShape): SpeechBubbleShape => {
	const newShape = deepCopy(shape)
	newShape.props.handles.handle.x = newShape.props.handles.handle.x * newShape.props.w
	newShape.props.handles.handle.y = newShape.props.handles.handle.y * newShape.props.h
	return newShape
}

export const getHandlesInHandleSpace = (shape: SpeechBubbleShape): SpeechBubbleShape => {
	const newShape = deepCopy(shape)
	newShape.props.handles.handle.x = newShape.props.handles.handle.x / newShape.props.w
	newShape.props.handles.handle.y = newShape.props.handles.handle.y / newShape.props.h

	return newShape
}

export class SpeechBubbleUtil extends ShapeUtil<SpeechBubbleShape> {
	static override type = 'speech-bubble' as const
	static override props = {
		w: T.number,
		h: T.number,
		size: DefaultSizeStyle,
		color: DefaultColorStyle,
		handles: {
			//TODO: Actually validate this
			validate: handleValidator,
			handle: { validate: handleValidator },
		},
	}

	override isAspectRatioLocked = (_shape: SpeechBubbleShape) => false

	override canResize = (_shape: SpeechBubbleShape) => true

	override canBind = (_shape: SpeechBubbleShape) => true

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
