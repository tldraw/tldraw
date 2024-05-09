import {
	BindingOnShapeChangeOptions,
	BindingOnShapeDeleteOptions,
	BindingUtil,
	Box,
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
	TLBaseBinding,
	TLBaseShape,
	TLGeoShape,
	TLHandle,
	TLOnBeforeUpdateHandler,
	TLOnHandleDragHandler,
	TLOnResizeHandler,
	TextLabel,
	Vec,
	VecModel,
	ZERO_INDEX_KEY,
	invLerp,
	lerp,
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

	override onHandleDrag: TLOnHandleDragHandler<SpeechBubbleShape> = (speechBubble, { handle }) => {
		const adjustedTailShape = this.getAdjustedTail(speechBubble)
		const bindingHandle = this.getHandles(adjustedTailShape)[0]
		this.createOrUpdateBinding(speechBubble, bindingHandle)
		return {
			...speechBubble,
			props: {
				tail: {
					x: handle.x / speechBubble.props.w,
					y: handle.y / this.getHeight(speechBubble),
				},
			},
		}
	}

	override onBeforeCreate = (next: SpeechBubbleShape) => {
		return this.getGrowY(next, next.props.growY)
	}

	override onTranslateEnd = (_initial: SpeechBubbleShape, next: SpeechBubbleShape) => {
		const handle = this.getHandles(next)[0]
		this.createOrUpdateBinding(next, handle)
	}

	// [5]
	override onBeforeUpdate: TLOnBeforeUpdateHandler<SpeechBubbleShape> | undefined = (
		prev: SpeechBubbleShape,
		shape: SpeechBubbleShape
	) => {
		const next = this.getAdjustedTail(shape)
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
					textWidth={shape.props.w}
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

	getAdjustedTail(shape: SpeechBubbleShape) {
		// Do we have a binding? If so, let's try to preserve it
		let next = structuredClone(shape)
		const bindings = this.editor.getBindingsFromShape(shape, 'speech-bubble')
		const draggingHandle = this.editor.isIn('select.dragging_handle')
		if (bindings.length > 0 && !draggingHandle) {
			const binding = bindings[0] as SpeechBubbleBinding
			const anchor = binding.props.anchor
			const toShape = this.editor.getShape(binding.toId) as TLGeoShape

			const pageAnchor = {
				x: lerp(toShape.x, toShape.x + toShape.props.w, anchor.x),
				y: lerp(toShape.y, toShape.y + toShape.props.h, anchor.y),
			}

			const shapeSpaceAnchor = this.editor.getPointInShapeSpace(shape, pageAnchor)

			shapeSpaceAnchor.x = invLerp(0, shape.props.w, shapeSpaceAnchor.x)
			shapeSpaceAnchor.y = invLerp(0, this.getHeight(shape), shapeSpaceAnchor.y)

			next = {
				...shape,
				props: {
					...shape.props,
					tail: {
						x: shapeSpaceAnchor.x,
						y: shapeSpaceAnchor.y,
					},
				},
			}
		}
		const { w, tail } = next.props
		const fullHeight = this.getHeight(next)

		const { segmentsIntersection, insideShape } = getTailIntersectionPoint(next)

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

		next.props.tail.x = newPoint.x / w
		next.props.tail.y = newPoint.y / fullHeight
		if (bindings.length > 0 && !draggingHandle) {
			const binding = bindings[0] as SpeechBubbleBinding
			const toShape = this.editor.getShape(binding.toId) as TLGeoShape
			const pageTail = {
				x: lerp(next.x, next.x + next.props.w, next.props.tail.x),
				y: lerp(next.y, next.y + this.getHeight(next), next.props.tail.y),
			}
			if (
				pageTail.x < toShape.x ||
				pageTail.x > toShape.x + (toShape.props.w || 0) ||
				pageTail.y < toShape.y ||
				pageTail.y > toShape.y + toShape.props.h
			) {
				this.editor.deleteBindings([binding])
			}
		}

		return next
	}

	createOrUpdateBinding = (speechBubble: SpeechBubbleShape, handle: TLHandle) => {
		const pageAnchor = this.editor
			.getShapePageTransform(speechBubble)
			.applyToPoint({ x: handle.x, y: handle.y })
		const target = this.editor.getShapeAtPoint(pageAnchor, {
			hitInside: true,
			filter: (shape) => shape.id !== speechBubble.id,
		})

		if (target) {
			const targetBounds = Box.ZeroFix(this.editor.getShapeGeometry(target)!.bounds)
			const pointInTargetSpace = this.editor.getPointInShapeSpace(target, pageAnchor)

			const anchor = {
				x: invLerp(targetBounds.minX, targetBounds.maxX, pointInTargetSpace.x),
				y: invLerp(targetBounds.minY, targetBounds.maxY, pointInTargetSpace.y),
			}

			const bindings = this.editor.getBindingsFromShape(speechBubble, 'speech-bubble')
			const bindingExists = bindings.length > 0
			if (bindingExists) {
				this.editor.updateBinding({
					...bindings[0],
					props: {
						anchor,
					},
				})
			} else {
				this.editor.createBinding({
					type: 'speech-bubble',
					fromId: speechBubble.id,
					toId: target.id,
					props: {
						anchor,
					},
				})
			}
		} else {
			const bindings = this.editor.getBindingsFromShape(speechBubble, 'speech-bubble')
			this.editor.deleteBindings(bindings)
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

type SpeechBubbleBinding = TLBaseBinding<
	'speech-bubble',
	{
		anchor: VecModel
	}
>
export class SpeechBubbleBindingUtil extends BindingUtil<SpeechBubbleBinding> {
	static override type = 'speech-bubble' as const

	override getDefaultProps() {
		return {
			anchor: { x: 0.5, y: 0.5 },
		}
	}

	// when the shape we're stuck to changes, update the speechBubble's position
	override onAfterChangeToShape({
		binding,
	}: BindingOnShapeChangeOptions<SpeechBubbleBinding>): void {
		const speechBubble = this.editor.getShape<SpeechBubbleShape>(binding.fromId)!
		const speechBubbleUtil = this.editor.getShapeUtil(speechBubble) as SpeechBubbleUtil

		const updatedTailSpeechBubble = speechBubbleUtil.getAdjustedTail(speechBubble)

		this.editor.updateShape(updatedTailSpeechBubble)
	}

	// when the thing we're stuck to is deleted, delete the binding too
	override onBeforeDeleteToShape({
		binding,
	}: BindingOnShapeDeleteOptions<SpeechBubbleBinding>): void {
		const speechBubble = this.editor.getShape<SpeechBubbleShape>(binding.fromId)
		if (speechBubble) this.editor.deleteBinding(binding.id)
	}
}
