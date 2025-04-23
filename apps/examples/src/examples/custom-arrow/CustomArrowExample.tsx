import {
	BindingOnShapeDeleteOptions,
	BindingUtil,
	DefaultToolbar,
	DefaultToolbarContent,
	Mat,
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
	TLUiComponents,
	TLUiOverrides,
	Tldraw,
	TldrawUiMenuItem,
	Vec,
	VecModel,
	createShapeId,
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
			end: { x: 100, y: 50 },
		}
	}

	override canBind() {
		// custom arrows can bind to anything
		return true
	}
	override canEdit() {
		return false
	}
	// override canResize() {
	// 	return false
	// }
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

	override onHandleDrag(shape: WireShape, info: TLHandleDragInfo<WireShape>) {
		const { handle } = info
		const { currentPagePoint } = this.editor.inputs

		const pointInShapeSpace = this.editor.getPointInShapeSpace(shape, currentPagePoint)
		const pointInParentSpace = this.editor.getPointInParentSpace(shape, currentPagePoint)
		const pageTransform = this.editor.getShapePageTransform(shape)!
		const endInPageSpace = Mat.applyToPoint(
			pageTransform,
			new Vec(shape.props.end.x, shape.props.end.y)
		)

		if (handle.id === 'start') {
			this.editor.updateShape({
				...shape,
				x: pointInParentSpace.x,
				y: pointInParentSpace.y,
			})
			const updatedShape = this.editor.getShape(shape.id)!
			const endPointInShapeSpace = this.editor.getPointInShapeSpace(updatedShape, endInPageSpace)
			this.editor.updateShape({
				...updatedShape,
				props: {
					end: { x: endPointInShapeSpace.x, y: endPointInShapeSpace.y },
				},
			})
		} else if (handle.id === 'end') {
			this.editor.updateShape({
				...shape,
				props: {
					end: { x: pointInShapeSpace.x, y: pointInShapeSpace.y },
				},
			})
		}
	}

	override component(shape: WireShape) {
		return (
			<SVGContainer>
				<line
					x1={0}
					y1={0}
					x2={shape.props.end.x}
					y2={shape.props.end.y}
					stroke="red"
					strokeWidth={2}
				></line>
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

	// when one of the things we're connected to is deleted, delete the wire too
	override onBeforeDeleteToShape({ binding }: BindingOnShapeDeleteOptions<WireBinding>): void {
		this.editor.deleteShape(binding.fromId)
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
			label: 'Sticker',
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
		const isStickerSelected = useIsToolSelected(wire)
		return (
			<DefaultToolbar {...props}>
				<TldrawUiMenuItem {...wire} isSelected={isStickerSelected} />
				<DefaultToolbarContent />
			</DefaultToolbar>
		)
	},
}

export default function StickerExample() {
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
