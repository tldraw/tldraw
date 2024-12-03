import {
	BindingOnShapeChangeOptions,
	BindingOnShapeDeleteOptions,
	BindingUtil,
	Box,
	DefaultToolbar,
	DefaultToolbarContent,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	StateNode,
	TLBaseBinding,
	TLBaseShape,
	TLPointerEventInfo,
	TLUiComponents,
	TLUiOverrides,
	Tldraw,
	TldrawUiMenuItem,
	VecModel,
	createShapeId,
	invLerp,
	lerp,
	useIsToolSelected,
	useTools,
} from 'tldraw'
import 'tldraw/tldraw.css'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type StickerShape = TLBaseShape<'sticker', {}>

const offsetX = -16
const offsetY = -26
class StickerShapeUtil extends ShapeUtil<StickerShape> {
	static override type = 'sticker' as const
	static override props: RecordProps<StickerShape> = {}

	override getDefaultProps() {
		return {}
	}

	override canBind() {
		// stickers can bind to anything
		return true
	}
	override canEdit() {
		return false
	}
	override canResize() {
		return false
	}
	override canSnap() {
		return false
	}
	override hideRotateHandle() {
		return true
	}
	override isAspectRatioLocked() {
		return true
	}

	override getGeometry() {
		return new Rectangle2d({
			width: 32,
			height: 32,
			x: offsetX,
			y: offsetY,
			isFilled: true,
		})
	}

	override component() {
		return (
			<div
				style={{
					width: '100%',
					height: '100%',
					marginLeft: offsetX,
					marginTop: offsetY,
					fontSize: '26px',
					textAlign: 'center',
				}}
			>
				❤️
			</div>
		)
	}

	override indicator() {
		return <rect width={32} height={32} x={offsetX} y={offsetY} />
	}

	override onTranslateStart(shape: StickerShape) {
		const bindings = this.editor.getBindingsFromShape(shape, 'sticker')
		this.editor.deleteBindings(bindings)
	}

	override onTranslateEnd(_initial: StickerShape, sticker: StickerShape) {
		const pageAnchor = this.editor.getShapePageTransform(sticker).applyToPoint({ x: 0, y: 0 })
		const target = this.editor.getShapeAtPoint(pageAnchor, {
			hitInside: true,
			filter: (shape) =>
				shape.id !== sticker.id &&
				this.editor.canBindShapes({ fromShape: sticker, toShape: shape, binding: 'sticker' }),
		})

		if (!target) return

		const targetBounds = Box.ZeroFix(this.editor.getShapeGeometry(target)!.bounds)
		const pointInTargetSpace = this.editor.getPointInShapeSpace(target, pageAnchor)

		const anchor = {
			x: invLerp(targetBounds.minX, targetBounds.maxX, pointInTargetSpace.x),
			y: invLerp(targetBounds.minY, targetBounds.maxY, pointInTargetSpace.y),
		}

		this.editor.createBinding({
			type: 'sticker',
			fromId: sticker.id,
			toId: target.id,
			props: {
				anchor,
			},
		})
	}
}

type StickerBinding = TLBaseBinding<
	'sticker',
	{
		anchor: VecModel
	}
>
class StickerBindingUtil extends BindingUtil<StickerBinding> {
	static override type = 'sticker' as const

	override getDefaultProps() {
		return {
			anchor: { x: 0.5, y: 0.5 },
		}
	}

	// when the shape we're stuck to changes, update the sticker's position
	override onAfterChangeToShape({
		binding,
		shapeAfter,
	}: BindingOnShapeChangeOptions<StickerBinding>): void {
		const sticker = this.editor.getShape<StickerShape>(binding.fromId)!

		const shapeBounds = this.editor.getShapeGeometry(shapeAfter)!.bounds
		const shapeAnchor = {
			x: lerp(shapeBounds.minX, shapeBounds.maxX, binding.props.anchor.x),
			y: lerp(shapeBounds.minY, shapeBounds.maxY, binding.props.anchor.y),
		}
		const pageAnchor = this.editor.getShapePageTransform(shapeAfter).applyToPoint(shapeAnchor)

		const stickerParentAnchor = this.editor
			.getShapeParentTransform(sticker)
			.invert()
			.applyToPoint(pageAnchor)

		this.editor.updateShape({
			id: sticker.id,
			type: 'sticker',
			x: stickerParentAnchor.x,
			y: stickerParentAnchor.y,
		})
	}

	// when the thing we're stuck to is deleted, delete the sticker too
	override onBeforeDeleteToShape({ binding }: BindingOnShapeDeleteOptions<StickerBinding>): void {
		this.editor.deleteShape(binding.fromId)
	}
}

class StickerTool extends StateNode {
	static override id = 'sticker'

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onPointerDown(info: TLPointerEventInfo) {
		const { currentPagePoint } = this.editor.inputs
		const stickerId = createShapeId()
		this.editor.markHistoryStoppingPoint()
		this.editor.createShape({
			id: stickerId,
			type: 'sticker',
			x: currentPagePoint.x,
			y: currentPagePoint.y,
		})
		this.editor.setSelectedShapes([stickerId])
		this.editor.setCurrentTool('select.translating', {
			...info,
			target: 'shape',
			shape: this.editor.getShape(stickerId),
			isCreating: true,
			onInteractionEnd: 'sticker',
			onCreate: () => {
				this.editor.setCurrentTool('sticker')
			},
		})
	}
}

const overrides: TLUiOverrides = {
	tools(editor, schema) {
		schema['sticker'] = {
			id: 'sticker',
			label: 'Sticker',
			icon: 'heart-icon',
			kbd: 'p',
			onSelect: () => {
				editor.setCurrentTool('sticker')
			},
		}
		return schema
	},
}

const components: TLUiComponents = {
	Toolbar: (...props) => {
		const sticker = useTools().sticker
		const isStickerSelected = useIsToolSelected(sticker)
		return (
			<DefaultToolbar {...props}>
				<TldrawUiMenuItem {...sticker} isSelected={isStickerSelected} />
				<DefaultToolbarContent />
			</DefaultToolbar>
		)
	},
}

export default function StickerExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					;(window as any).editor = editor
				}}
				shapeUtils={[StickerShapeUtil]}
				bindingUtils={[StickerBindingUtil]}
				tools={[StickerTool]}
				overrides={overrides}
				components={components}
			/>
		</div>
	)
}
