import {
	BindingOnShapeChangeOptions,
	BindingOnShapeDeleteOptions,
	BindingUtil,
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
type MagnetShape = TLBaseShape<'magnet', {}>

const offsetX = -12
const offsetY = -12

class MagnetShapeUtil extends ShapeUtil<MagnetShape> {
	static override type = 'magnet' as const
	static override props: RecordProps<MagnetShape> = {}

	override getDefaultProps() {
		return {}
	}

	override canBind() {
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
			width: 24,
			height: 24,
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
					fontSize: '20px',
					textAlign: 'center',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				🧲
			</div>
		)
	}

	override indicator() {
		return <rect width={24} height={24} x={offsetX} y={offsetY} rx={4} />
	}

	override onTranslateStart(shape: MagnetShape) {
		const bindings = this.editor.getBindingsFromShape(shape, 'magnet')
		this.editor.deleteBindings(bindings)
	}

	override onTranslateEnd(_initial: MagnetShape, magnet: MagnetShape) {
		const pageAnchor = this.editor.getShapePageTransform(magnet).applyToPoint({ x: 0, y: 0 })
		const target = this.editor.getShapeAtPoint(pageAnchor, {
			hitInside: true,
			filter: (shape) =>
				shape.id !== magnet.id &&
				shape.type !== 'magnet' &&
				this.editor.canBindShapes({ fromShape: magnet, toShape: shape, binding: 'magnet' }),
		})

		if (!target) return

		const targetBounds = this.editor.getShapeGeometry(target)!.bounds
		const pointInTargetSpace = this.editor.getPointInShapeSpace(target, pageAnchor)

		const anchor = {
			x: invLerp(targetBounds.minX, targetBounds.maxX, pointInTargetSpace.x),
			y: invLerp(targetBounds.minY, targetBounds.maxY, pointInTargetSpace.y),
		}

		this.editor.createBinding({
			type: 'magnet',
			fromId: magnet.id,
			toId: target.id,
			props: {
				anchor,
			},
		})
	}
}

type MagnetBinding = TLBaseBinding<
	'magnet',
	{
		anchor: VecModel
	}
>

class MagnetBindingUtil extends BindingUtil<MagnetBinding> {
	static override type = 'magnet' as const

	override getDefaultProps() {
		return {
			anchor: { x: 0.5, y: 0.5 },
		}
	}

	override onAfterChangeToShape({
		binding,
		shapeAfter,
	}: BindingOnShapeChangeOptions<MagnetBinding>): void {
		const magnet = this.editor.getShape<MagnetShape>(binding.fromId)!

		const shapeBounds = this.editor.getShapeGeometry(shapeAfter)!.bounds
		const shapeAnchor = {
			x: lerp(shapeBounds.minX, shapeBounds.maxX, binding.props.anchor.x),
			y: lerp(shapeBounds.minY, shapeBounds.maxY, binding.props.anchor.y),
		}
		const pageAnchor = this.editor.getShapePageTransform(shapeAfter).applyToPoint(shapeAnchor)

		const magnetParentAnchor = this.editor
			.getShapeParentTransform(magnet)
			.invert()
			.applyToPoint(pageAnchor)

		this.editor.updateShape({
			id: magnet.id,
			type: 'magnet',
			x: magnetParentAnchor.x,
			y: magnetParentAnchor.y,
		})
	}

	override onBeforeDeleteToShape({ binding }: BindingOnShapeDeleteOptions<MagnetBinding>): void {
		this.editor.deleteShape(binding.fromId)
	}
}

class MagnetTool extends StateNode {
	static override id = 'magnet'

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onPointerDown(info: TLPointerEventInfo) {
		const { currentPagePoint } = this.editor.inputs
		const magnetId = createShapeId()
		this.editor.markHistoryStoppingPoint()
		this.editor.createShape({
			id: magnetId,
			type: 'magnet',
			x: currentPagePoint.x,
			y: currentPagePoint.y,
		})
		this.editor.setSelectedShapes([magnetId])
		this.editor.setCurrentTool('select.translating', {
			...info,
			target: 'shape',
			shape: this.editor.getShape(magnetId),
			isCreating: true,
			onInteractionEnd: 'magnet',
			onCreate: () => {
				this.editor.setCurrentTool('magnet')
			},
		})
	}
}

const overrides: TLUiOverrides = {
	tools(editor, schema) {
		schema['magnet'] = {
			id: 'magnet',
			label: 'Magnet',
			icon: 'heart-icon',
			kbd: 'm',
			onSelect: () => {
				editor.setCurrentTool('magnet')
			},
		}
		return schema
	},
}

const components: TLUiComponents = {
	Toolbar: (...props) => {
		const magnet = useTools().magnet
		const isMagnetSelected = useIsToolSelected(magnet)
		return (
			<DefaultToolbar {...props}>
				<TldrawUiMenuItem {...magnet} isSelected={isMagnetSelected} />
				<DefaultToolbarContent />
			</DefaultToolbar>
		)
	},
}

export default function MagnetExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="magnet-example"
				onMount={(editor) => {
					// Create some demo shapes to demonstrate the binding
					editor.createShapes([
						{
							type: 'geo',
							x: 200,
							y: 200,
							props: { w: 120, h: 80, geo: 'rectangle', fill: 'solid', color: 'blue' },
						},
						{
							type: 'geo',
							x: 400,
							y: 150,
							props: { w: 100, h: 100, geo: 'ellipse', fill: 'solid', color: 'green' },
						},
						{
							type: 'text',
							x: 300,
							y: 350,
							props: { text: 'Drag magnets onto shapes!' },
						},
					])

					// Create a couple of magnets to demonstrate
					editor.createShapes([
						{ type: 'magnet', x: 100, y: 100 },
						{ type: 'magnet', x: 150, y: 100 },
					])

					;(window as any).editor = editor
				}}
				shapeUtils={[MagnetShapeUtil]}
				bindingUtils={[MagnetBindingUtil]}
				tools={[MagnetTool]}
				overrides={overrides}
				components={components}
			/>
		</div>
	)
}