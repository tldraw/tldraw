import {
	BindingOnShapeChangeOptions,
	BindingUtil,
	DefaultToolbar,
	DefaultToolbarContent,
	Polyline2d,
	SVGContainer,
	ShapeUtil,
	StateNode,
	TLBaseBinding,
	TLBaseShape,
	TLHandle,
	TLHandleDragInfo,
	TLPointerEventInfo,
	TLResizeInfo,
	TLShapePartial,
	TLUiComponents,
	TLUiOverrides,
	Tldraw,
	TldrawUiMenuItem,
	Vec,
	VecModel,
	createShapeId,
	lerp,
	useIsToolSelected,
	useTools,
} from 'tldraw'
import 'tldraw/tldraw.css'

type WireShape = TLBaseShape<
	'wire',
	{
		end: VecModel
	}
>

class WireShapeUtil extends ShapeUtil<WireShape> {
	static override type = 'wire' as const

	override getDefaultProps() {
		return {
			end: { x: 0, y: 0 },
		}
	}

	override canBind({ toShapeType }: { toShapeType: string }) {
		return toShapeType !== 'wire'
	}
	override canEdit() {
		return false
	}
	override canSnap() {
		return false
	}
	override hideRotateHandle() {
		return true
	}
	override hideResizeHandles() {
		return true
	}
	override hideSelectionBoundsBg() {
		return true
	}
	override hideSelectionBoundsFg() {
		return true
	}

	override getHandles(shape: WireShape): TLHandle[] {
		return [
			{
				id: 'start',
				index: 'a0',
				type: 'vertex',
				x: 0,
				y: 0,
			},
			{
				id: 'end',
				index: 'a1',
				type: 'vertex',
				x: shape.props.end.x,
				y: shape.props.end.y,
			},
		] as TLHandle[]
	}

	override getGeometry(shape: WireShape) {
		return new Polyline2d({
			points: [new Vec(0, 0), new Vec(shape.props.end.x, shape.props.end.y)],
		})
	}

	override onHandleDrag(wire: WireShape, info: TLHandleDragInfo<WireShape>) {
		const { handle } = info
		const { currentPagePoint } = this.editor.inputs

		const target = this.editor.getShapeAtPoint(currentPagePoint, {
			hitInside: true,
			filter: (shape) =>
				shape.id !== wire.id &&
				this.editor.canBindShapes({ fromShape: wire, toShape: shape, binding: 'wire' }),
		})

		const oppositeBinding = this.editor
			.getBindingsFromShape<WireBinding>(wire.id, 'wire')
			.find((b) => b.props.type !== handle.id)

		if (target && target.id !== oppositeBinding?.toId) {
			const existingBinding = this.editor
				.getBindingsFromShape<WireBinding>(wire.id, 'wire')
				.find((b) => b.props.type === handle.id)

			if (existingBinding) {
				this.editor.updateBinding({
					...existingBinding,
					toId: target.id,
					props: {
						type: handle.id,
					},
				})
			} else {
				this.editor.createBinding({
					type: 'wire',
					fromId: wire.id,
					toId: target.id,
					props: {
						type: handle.id,
					},
				})
			}
			this.editor.setHintingShapes([target.id])
		} else {
			const existingBinding = this.editor
				.getBindingsFromShape(wire.id, 'wire')
				.find((b) => (b as WireBinding).props.type === handle.id)

			if (existingBinding) {
				this.editor.deleteBinding(existingBinding)
			}
			this.editor.setHintingShapes([])
		}

		const update: TLShapePartial<WireShape> = {
			id: wire.id,
			type: 'wire',
			props: {},
		}

		const pointInShapeSpace = this.editor.getPointInShapeSpace(wire, currentPagePoint)
		if (handle.id === 'start') {
			const pointInParentSpace = this.editor.getPointInParentSpace(wire, currentPagePoint)
			update.x = pointInParentSpace.x
			update.y = pointInParentSpace.y
			update.props = {
				end: {
					x: wire.props.end.x - pointInShapeSpace.x,
					y: wire.props.end.y - pointInShapeSpace.y,
				},
			}
			return update
		}

		update.props = {
			end: { x: pointInShapeSpace.x, y: pointInShapeSpace.y },
		}
		return update
	}

	override component(shape: WireShape) {
		const midPoint = {
			x: shape.props.end.x / 2,
			y: shape.props.end.y / 2,
		}

		const rotation = Math.atan2(shape.props.end.y, shape.props.end.x) * (180 / Math.PI)
		const trianglePoints = [
			[midPoint.x + 10, midPoint.y],
			[midPoint.x - 10, midPoint.y - 10],
			[midPoint.x - 10, midPoint.y + 10],
		]
			.map((point) => point.join(','))
			.join(' ')

		return (
			<SVGContainer>
				<line
					x1={0}
					y1={0}
					x2={shape.props.end.x}
					y2={shape.props.end.y}
					stroke="red"
					strokeWidth={4}
				/>
				<polygon
					points={trianglePoints}
					fill="red"
					transform={`rotate(${rotation}, ${midPoint.x}, ${midPoint.y})`}
				/>
			</SVGContainer>
		)
	}

	override indicator(shape: WireShape) {
		return <line x1={0} y1={0} x2={shape.props.end.x} y2={shape.props.end.y} />
	}

	override onResize(shape: WireShape, info: TLResizeInfo<WireShape>) {
		const { scaleX, scaleY } = info
		return {
			props: {
				end: {
					x: shape.props.end.x * scaleX,
					y: shape.props.end.y * scaleY,
				},
			},
		}
	}
}

type WireBinding = TLBaseBinding<
	'wire',
	{
		type: 'start' | 'end'
	}
>

class WireBindingUtil extends BindingUtil<WireBinding> {
	static override type = 'wire' as const

	override getDefaultProps(): WireBinding['props'] {
		return {
			type: 'start',
		}
	}

	override onAfterChangeToShape({ binding }: BindingOnShapeChangeOptions<WireBinding>) {
		return this.updateBinding(binding)
	}

	override onAfterChangeFromShape({ binding }: BindingOnShapeChangeOptions<WireBinding>) {
		return this.updateBinding(binding)
	}

	updateBinding(binding: WireBinding) {
		const wire = this.editor.getShape<WireShape>(binding.fromId)!
		const target = this.editor.getShape(binding.toId)!

		const shapeBounds = this.editor.getShapeGeometry(target)!.bounds
		const pointInTargetSpace = {
			x: lerp(shapeBounds.minX, shapeBounds.maxX, 0.5),
			y: lerp(shapeBounds.minY, shapeBounds.maxY, 0.5),
		}

		const pointInPageSpace = this.editor
			.getShapePageTransform(target)
			.applyToPoint(pointInTargetSpace)

		if (binding.props.type === 'start') {
			const pointInParentSpace = this.editor.getPointInParentSpace(wire, pointInPageSpace)
			const pointInWireSpace = this.editor.getPointInShapeSpace(wire, pointInPageSpace)
			this.editor.updateShape({
				id: wire.id,
				type: 'wire',
				x: pointInParentSpace.x,
				y: pointInParentSpace.y,
				props: {
					end: {
						x: wire.props.end.x - pointInWireSpace.x,
						y: wire.props.end.y - pointInWireSpace.y,
					},
				},
			})
		} else {
			const endInShapeSpace = this.editor.getPointInShapeSpace(wire, pointInPageSpace)
			this.editor.updateShape({
				id: wire.id,
				type: 'wire',
				props: {
					end: {
						x: endInShapeSpace.x,
						y: endInShapeSpace.y,
					},
				},
			})
		}
	}
}

class WireTool extends StateNode {
	static override id = 'wire'

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onPointerDown(info: TLPointerEventInfo) {
		const { currentPagePoint } = this.editor.inputs
		const wireId = createShapeId()
		this.editor.markHistoryStoppingPoint()
		this.editor.createShape({
			id: wireId,
			type: 'wire',
			x: currentPagePoint.x,
			y: currentPagePoint.y,
		})
		this.editor.setSelectedShapes([wireId])
		const handle = this.editor.getShapeHandles(wireId)?.find((h) => h.id === 'end')
		if (!handle) return
		this.editor.setCurrentTool('select.dragging_handle', {
			...info,
			handle,
			target: 'shape',
			shape: this.editor.getShape(wireId),
			isCreating: true,
		})
	}
}

const overrides: TLUiOverrides = {
	tools(editor, schema) {
		schema['wire'] = {
			id: 'wire',
			label: 'Wire',
			icon: 'arrowhead-triangle',
			kbd: 'w',
			onSelect: () => {
				editor.setCurrentTool('wire')
			},
		}
		return schema
	},
}

const components: TLUiComponents = {
	Toolbar: (...props) => {
		const wire = useTools()['wire']
		const isWireSelected = useIsToolSelected(wire)
		return (
			<DefaultToolbar {...props}>
				<TldrawUiMenuItem {...wire} isSelected={isWireSelected} />
				<DefaultToolbarContent />
			</DefaultToolbar>
		)
	},
}

export default function CustomArrowExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="custom-arrow-example"
				shapeUtils={[WireShapeUtil]}
				bindingUtils={[WireBindingUtil]}
				tools={[WireTool]}
				overrides={overrides}
				components={components}
			/>
		</div>
	)
}
