import {
	BindingUtil,
	Box,
	DefaultFillStyle,
	DefaultToolbar,
	DefaultToolbarContent,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	StateNode,
	TLBaseBinding,
	TLBaseShape,
	TLBindingPartial,
	TLEventHandlers,
	TLOnTranslateEndHandler,
	TLOnTranslateStartHandler,
	TLUiComponents,
	TLUiOverrides,
	Tldraw,
	TldrawUiMenuItem,
	VecModel,
	createBindingId,
	createShapeId,
	invLerp,
	lerp,
	useIsToolSelected,
	useTools,
	vecModelValidator,
} from 'tldraw'

// eslint-disable-next-line @typescript-eslint/ban-types
type PinShape = TLBaseShape<'pin', {}>

const offsetX = -16
const offsetY = -26
class PinShapeUtil extends ShapeUtil<PinShape> {
	static override type = 'pin' as const
	static override props: RecordProps<PinShape> = {}

	override getDefaultProps() {
		return {}
	}

	override canBind = () => false
	override canEdit = () => false
	override canResize = () => false
	override hideRotateHandle = () => true
	override isAspectRatioLocked = () => true

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
				📍
			</div>
		)
	}

	override indicator() {
		return <rect width={32} height={32} x={offsetX} y={offsetY} />
	}

	override onTranslateStart: TLOnTranslateStartHandler<PinShape> = (pin) => {
		const bindings = this.editor.getBindingsFromShape<PinBinding>(pin, 'pin')
		this.editor.deleteBindings(bindings)
	}

	override onTranslateEnd?: TLOnTranslateEndHandler<PinShape> = (pin) => {
		const pageAnchor = this.editor.getShapePageTransform(pin).applyToPoint({ x: 0, y: 0 })

		const bindings: TLBindingPartial<PinBinding>[] = []
		for (const target of this.editor.getCurrentPageShapesSorted()) {
			if (target.id === pin.id) break
			if (target.type === 'pin') continue
			if (!this.editor.isPointInShape(target, pageAnchor, { margin: 0, hitInside: true })) continue

			const targetBounds = Box.ZeroFix(this.editor.getShapeGeometry(target)!.bounds)
			const pointInTargetSpace = this.editor.getPointInShapeSpace(target, pageAnchor)

			const anchor = {
				x: invLerp(targetBounds.minX, targetBounds.maxX, pointInTargetSpace.x),
				y: invLerp(targetBounds.minY, targetBounds.maxY, pointInTargetSpace.y),
			}

			bindings.push({
				id: createBindingId(),
				fromId: pin.id,
				toId: target.id,
				type: 'pin',
				props: { anchor },
			})
		}

		this.editor.createBindings(bindings)
	}
}

type PinBinding = TLBaseBinding<
	'pin',
	{
		anchor: VecModel
	}
>

class PinBindingUtil extends BindingUtil<PinBinding> {
	static override type = 'pin' as const
	static override props: RecordProps<PinBinding> = {
		anchor: vecModelValidator,
	}

	// constructor

	override getDefaultProps() {
		return {}
	}

	private movePinWithShape(binding: PinBinding) {
		const pin = this.editor.getShape<PinShape>(binding.fromId)!
		const shape = this.editor.getShape(binding.toId)!

		const shapeBounds = this.editor.getShapeGeometry(shape)!.bounds
		const shapeAnchor = {
			x: lerp(shapeBounds.minX, shapeBounds.maxX, binding.props.anchor.x),
			y: lerp(shapeBounds.minY, shapeBounds.maxY, binding.props.anchor.y),
		}
		const pageAnchor = this.editor.getShapePageTransform(shape).applyToPoint(shapeAnchor)

		const pinParentAnchor = this.editor
			.getShapeParentTransform(pin)
			.invert()
			.applyToPoint(pageAnchor)

		if (Math.abs(pinParentAnchor.x - pin.x) > 0.01 || Math.abs(pinParentAnchor.y - pin.y) > 0.01) {
			this.editor.updateShape({
				id: pin.id,
				type: 'pin',
				x: pinParentAnchor.x,
				y: pinParentAnchor.y,
			})
		}
	}

	private moveShapeWithPin(binding: PinBinding) {
		const pin = this.editor.getShape<PinShape>(binding.fromId)!
		const shape = this.editor.getShape(binding.toId)!

		const pinPageAnchor = this.editor.getShapePageTransform(pin).applyToPoint({ x: 0, y: 0 })
		const shapeBounds = this.editor.getShapeGeometry(shape)!.bounds
		const pinShapeAnchor = this.editor.getPointInShapeSpace(shape, pinPageAnchor)

		const targetPinShapeX = lerp(shapeBounds.minX, shapeBounds.maxX, binding.props.anchor.x)
		const targetPinShapeY = lerp(shapeBounds.minY, shapeBounds.maxY, binding.props.anchor.y)

		const dx = pinShapeAnchor.x - targetPinShapeX
		const dy = pinShapeAnchor.y - targetPinShapeY

		if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
			this.editor.updateShape({
				id: shape.id,
				type: shape.type,
				x: shape.x + dx,
				y: shape.y + dy,
			})
		}
	}

	override onAfterChangeToShape(binding: PinBinding): void {
		this.movePinWithShape(binding)
	}

	override onAfterChangeFromShape(binding: PinBinding): void {
		this.moveShapeWithPin(binding)
	}
}

class PinTool extends StateNode {
	static override id = 'pin'

	override onEnter = () => {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onPointerDown: TLEventHandlers['onPointerDown'] = (info) => {
		const { currentPagePoint } = this.editor.inputs
		const pinId = createShapeId()
		this.editor.mark(`creating:${pinId}`)
		this.editor.createShape({
			id: pinId,
			type: 'pin',
			x: currentPagePoint.x,
			y: currentPagePoint.y,
		})
		this.editor.setSelectedShapes([pinId])
		this.editor.setCurrentTool('select.translating', {
			...info,
			target: 'shape',
			shape: this.editor.getShape(pinId),
			isCreating: true,
			onInteractionEnd: 'pin',
			onCreate: () => {
				if (this.editor.getInstanceState().isToolLocked) {
					this.editor.setCurrentTool('pin')
				} else {
					this.editor.setCurrentTool('select.idle')
				}
			},
		})
	}
}

const overrides: TLUiOverrides = {
	tools(editor, schema) {
		schema['pin'] = {
			id: 'pin',
			label: 'Pin',
			icon: 'color',
			kbd: 'p',
			onSelect: () => {
				editor.setCurrentTool('pin')
			},
		}
		return schema
	},
}

const components: TLUiComponents = {
	Toolbar: (...props) => {
		const pin = useTools().pin
		const isPinSelected = useIsToolSelected(pin)
		return (
			<DefaultToolbar {...props}>
				<TldrawUiMenuItem {...pin} isSelected={isPinSelected} />
				<DefaultToolbarContent />
			</DefaultToolbar>
		)
	},
}

export default function PinExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					editor.setStyleForNextShapes(DefaultFillStyle, 'semi')
				}}
				shapeUtils={[PinShapeUtil]}
				bindingUtils={[PinBindingUtil]}
				tools={[PinTool]}
				overrides={overrides}
				components={components}
			/>
		</div>
	)
}
