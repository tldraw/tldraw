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
export const TL_HANDLE_TYPES = new Set(['vertex', 'virtual', 'create'] as const)
export const handleValidator = () => true
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
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	override isAspectRatioLocked = (_shape: SpeechBubbleShape) => false
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	override canResize = (_shape: SpeechBubbleShape) => true
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
					x: 180,
					y: 180,
				},
			},
		}
	}

	getGeometry(shape: SpeechBubbleShape): Geometry2d {
		const speechBubbleGeometry = getSpeechBubbleGeometry(shape)
		const body = new Polygon2d({
			points: speechBubbleGeometry,
			isFilled: true,
		})
		return body
	}

	override getHandles(shape: SpeechBubbleShape) {
		const handles = shape.props.handles
		const handlesArray = Object.values(handles)
		return handlesArray
	}

	override onBeforeUpdate: TLOnBeforeUpdateHandler<SpeechBubbleShape> | undefined = (
		_: SpeechBubbleShape,
		next: SpeechBubbleShape
	) => {
		const { originalIntersection: intersection, insideShape } = getHandleIntersectionPoint({
			w: next.props.w,
			h: next.props.h,
			handle: next.props.handles.handle,
		})

		if (!intersection) throw new Error('No intersection')

		const intersectionVector = new Vec2d(intersection.x, intersection.y)
		const handleVector = new Vec2d(next.props.handles.handle.x, next.props.handles.handle.y)

		const topLeft = new Vec2d(0, 0)
		const bottomRight = new Vec2d(next.props.w, next.props.h)
		const center = new Vec2d(next.props.w / 2, next.props.h / 2)
		const MIN_DISTANCE = topLeft.dist(bottomRight) / 5

		const MAX_DISTANCE = topLeft.dist(bottomRight) / 1.5

		const distanceToIntersection = handleVector.dist(intersectionVector)
		const angle = Math.atan2(handleVector.y - center.y, handleVector.x - center.x)
		let newPoint = handleVector

		if (insideShape) {
			const direction = Vec2d.FromAngle(angle, MIN_DISTANCE)
			newPoint = intersectionVector.add(direction)
			return {
				...next,
				props: {
					...next.props,
					handles: {
						...next.props.handles,
						handle: {
							...next.props.handles.handle,
							x: newPoint.x,
							y: newPoint.y,
						},
					},
				},
			}
		}
		if (distanceToIntersection <= MIN_DISTANCE) {
			const direction = Vec2d.FromAngle(angle, MIN_DISTANCE)
			newPoint = intersectionVector.add(direction)
		}
		if (distanceToIntersection >= MAX_DISTANCE) {
			const direction = Vec2d.FromAngle(angle, MAX_DISTANCE)
			newPoint = intersectionVector.add(direction)
		}

		return {
			...next,
			props: {
				...next.props,
				handles: {
					...next.props.handles,
					handle: {
						...next.props.handles.handle,
						x: newPoint.x,
						y: newPoint.y,
					},
				},
			},
		}
	}

	override onHandleChange: TLOnHandleChangeHandler<SpeechBubbleShape> = (
		_,
		{ handle, initial }
	) => {
		const next = deepCopy(initial!)

		next.props.handles['handle'] = {
			...next.props.handles['handle'],
			x: handle.x,
			y: handle.y,
		}

		return next
	}

	component(shape: SpeechBubbleShape) {
		const theme = getDefaultColorTheme({
			isDarkMode: this.editor.user.getIsDarkMode(),
		})
		const geometry = getSpeechBubbleGeometry(shape)
		const pathData = 'M' + geometry[0] + 'L' + geometry.slice(1) + 'Z'
		const STROKE_SIZES = {
			s: 2,
			m: 3.5,
			l: 5,
			xl: 10,
		}
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
		const geometry = getSpeechBubbleGeometry(shape)
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

		const widthRatio = next.props.w / info.initialShape.props.w
		const heightRatio = next.props.h / info.initialShape.props.h
		const handle = next.props.handles.handle
		handle.x *= widthRatio
		handle.y *= heightRatio
		return {
			...next,
			props: {
				...next.props,
				handles: {
					...next.props.handles,
					handle: { ...handle, x: handle.x, y: handle.y },
				},
			},
		}
	}
}
