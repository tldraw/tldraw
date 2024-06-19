import {
	BindingOnShapeChangeOptions,
	BindingOnShapeDeleteOptions,
	BindingUtil,
	Box,
	HTMLContainer,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	T,
	TLBaseBinding,
	TLBaseShape,
	Tldraw,
	VecModel,
	createShapeId,
	invLerp,
} from 'tldraw'

// eslint-disable-next-line @typescript-eslint/ban-types
type ElementShape = TLBaseShape<'element', { color: string }>
// eslint-disable-next-line @typescript-eslint/ban-types
type ContainerShape = TLBaseShape<'element', { height: number; width: number }>

class ElementShapeUtil extends ShapeUtil<ElementShape> {
	static override type = 'element' as const
	static override props: RecordProps<ElementShape> = {
		color: T.string,
	}

	override getDefaultProps() {
		return {
			color: '#AEC6CF',
		}
	}

	override canBind({
		fromShapeType,
		toShapeType,
		bindingType,
	}: {
		fromShapeType: string
		toShapeType: string
		bindingType: string
	}) {
		return fromShapeType === 'element' && toShapeType === 'container' && bindingType === 'layout'
	}
	override canEdit = () => false
	override canResize = () => false
	override hideRotateHandle = () => true
	override isAspectRatioLocked = () => true

	override getGeometry() {
		return new Rectangle2d({
			width: 100,
			height: 100,
			isFilled: true,
		})
	}

	override component(shape: ElementShape) {
		return <HTMLContainer style={{ backgroundColor: shape.props.color }}></HTMLContainer>
	}

	override indicator() {
		return <rect width={100} height={100} />
	}

	override onTranslateStart = (shape: ElementShape) => {
		const bindings = this.editor.getBindingsFromShape(shape, 'layout')
		this.editor.deleteBindings(bindings)
	}

	override onTranslateEnd = (initial: ElementShape, element: ElementShape) => {
		const pageAnchor = this.editor.getShapePageTransform(element).applyToPoint({ x: 50, y: 50 })
		const target = this.editor.getShapeAtPoint(pageAnchor, {
			hitInside: true,
			filter: (shape) =>
				this.editor.canBindShapes({ fromShape: element, toShape: shape, binding: 'layout' }),
		})

		if (!target) return
		console.log('target', target)
		const targetBounds = Box.ZeroFix(this.editor.getShapeGeometry(target)!.bounds)
		const pointInTargetSpace = this.editor.getPointInShapeSpace(target, pageAnchor)

		const anchor = {
			x: invLerp(targetBounds.minX, targetBounds.maxX, pointInTargetSpace.x),
			y: invLerp(targetBounds.minY, targetBounds.maxY, pointInTargetSpace.y),
		}

		this.editor.createBinding({
			type: 'layout',
			fromId: element.id,
			toId: target.id,
			props: {
				anchor,
			},
		})
	}
}

const PADDING = 24
class ContainerShapeUtil extends ShapeUtil<ContainerShape> {
	static override type = 'container' as const
	static override props: RecordProps<ContainerShape> = { height: T.number, width: T.number }

	override getDefaultProps() {
		return {
			width: PADDING * 2,
			height: 100 + PADDING * 2,
		}
	}

	override canBind({
		fromShapeType,
		toShapeType,
		bindingType,
	}: {
		fromShapeType: string
		toShapeType: string
		bindingType: string
	}) {
		return fromShapeType === 'element' && toShapeType === 'container' && bindingType === 'layout'
	}
	override canEdit = () => false
	override canResize = () => false
	override hideRotateHandle = () => true
	override isAspectRatioLocked = () => true

	override getGeometry(shape: ContainerShape) {
		return new Rectangle2d({
			width: shape.props.width,
			height: shape.props.height,
			isFilled: true,
		})
	}

	override onBeforeUpdate = (shape: ContainerShape, changes: Partial<ContainerShape>) => {
		const bindings = this.editor.getBindingsToShape(shape, 'layout')
		const numberOfElements = bindings.length

		const next = {
			...shape,
			x: changes.x ?? shape.x,
			y: changes.y ?? shape.y,
			props: {
				...shape.props,
				width: numberOfElements * 100 + PADDING * (2 + numberOfElements),
			},
		}
		return next
	}
	override component(shape: ContainerShape) {
		return (
			<HTMLContainer
				style={{ backgroundColor: '#efefef', width: shape.props.width }}
			></HTMLContainer>
		)
	}

	override indicator(shape: ContainerShape) {
		return <rect width={shape.props.width} height={shape.props.height} />
	}
}

type LayoutBinding = TLBaseBinding<
	'layout',
	{
		anchor: VecModel
	}
>
class LayoutBindingUtil extends BindingUtil<LayoutBinding> {
	static override type = 'layout' as const

	override getDefaultProps() {
		return {
			anchor: { x: 0.5, y: 0.5 },
		}
	}

	// when the shape we're stuck to changes, update the sticker's position
	override onAfterChangeToShape({
		binding,
		shapeAfter,
	}: BindingOnShapeChangeOptions<LayoutBinding>): void {}

	// when the thing we're stuck to is deleted, delete the sticker too
	override onBeforeDeleteToShape({ binding }: BindingOnShapeDeleteOptions<LayoutBinding>): void {
		this.editor.deleteShape(binding.fromId)
	}
}

export default function LayoutExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					;(window as any).editor = editor
					const elementIds = [1, 2, 3, 4].map(() => createShapeId())
					const containerId = createShapeId()

					editor.createShapes([
						{ id: containerId, type: 'container', x: 500, y: 500 },
						{ id: elementIds[0], type: 'element', x: 100, y: 100, props: { color: '#AEC6CF' } },
						{ id: elementIds[1], type: 'element', x: 100, y: 100, props: { color: '#FF6961' } },
						{ id: elementIds[2], type: 'element', x: 100, y: 100, props: { color: '#C1E1C1' } },
						{ id: elementIds[3], type: 'element', x: 100, y: 100, props: { color: '#FFFAA0' } },
					])
				}}
				shapeUtils={[ContainerShapeUtil, ElementShapeUtil]}
				bindingUtils={[LayoutBindingUtil]}
			/>
		</div>
	)
}
