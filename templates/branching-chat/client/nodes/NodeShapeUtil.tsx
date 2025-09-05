import classNames from 'classnames'
import {
	Circle2d,
	Group2d,
	HTMLContainer,
	RecordProps,
	Rectangle2d,
	resizeBox,
	ShapeUtil,
	TLBaseShape,
	TLResizeInfo,
	useEditor,
	useUniqueSafeId,
	useValue,
} from 'tldraw'
import { NODE_WIDTH_PX, PORT_RADIUS_PX } from '../constants'
import { executionState } from '../execution/executionState'
import { getNodePorts } from './nodePorts'
import {
	getNodeHeightPx,
	getNodeWidthPx,
	NodeBody,
	NodeDefinitions,
	NodePorts,
	NodeType,
	NodeTypePorts,
} from './nodeTypes'

// Define our custom node shape type that extends tldraw's base shape system
export type NodeShape = TLBaseShape<'node', { node: NodeType }>

// This class extends tldraw's ShapeUtil to define how our custom node shapes behave
export class NodeShapeUtil extends ShapeUtil<NodeShape> {
	static override type = 'node' as const
	static override props: RecordProps<NodeShape> = {
		node: NodeType,
	}

	getDefaultProps(): NodeShape['props'] {
		return {
			node: NodeDefinitions[0].getDefault(),
		}
	}

	override canEdit() {
		return false
	}
	override canResize() {
		return false
	}
	override hideResizeHandles() {
		return true
	}
	override hideRotateHandle() {
		return true
	}
	override hideSelectionBoundsBg() {
		return true
	}
	override hideSelectionBoundsFg() {
		return true
	}
	override isAspectRatioLocked() {
		return false
	}
	override getBoundsSnapGeometry(_shape: NodeShape) {
		return {
			points: [{ x: 0, y: 0 }],
		}
	}

	// Define the geometry of our node shape including ports
	getGeometry(shape: NodeShape) {
		const ports = getNodePorts(this.editor, shape)

		const portGeometries = Object.values(ports).map(
			(port) =>
				new Circle2d({
					x: port.x - PORT_RADIUS_PX,
					y: port.y - PORT_RADIUS_PX,
					radius: PORT_RADIUS_PX,
					isFilled: true,
					// not a label, but this hack excludes them from the selection bounds which is useful
					isLabel: true,
				})
		)

		const bodyGeometry = new Rectangle2d({
			width: getNodeWidthPx(shape.props.node, this.editor),
			height: getNodeHeightPx(shape.props.node, this.editor),
			isFilled: true,
		})

		return new Group2d({
			children: [bodyGeometry, ...portGeometries],
		})
	}

	override onResize(shape: any, info: TLResizeInfo<any>) {
		return resizeBox(shape, info)
	}

	component(shape: NodeShape) {
		return <NodeShape shape={shape} />
	}

	indicator(shape: NodeShape) {
		const ports = getNodePorts(this.editor, shape)
		return <NodeShapeIndicator shape={shape} ports={ports} />
	}
}

// SVG indicator component that shows selection bounds and ports
function NodeShapeIndicator({ shape, ports }: { shape: NodeShape; ports: NodeTypePorts }) {
	const editor = useEditor()
	const id = useUniqueSafeId()
	const height = useValue('height', () => getNodeHeightPx(shape.props.node, editor), [
		shape.props.node,
		editor,
	])

	return (
		<>
			{/* Create a mask to show ports as holes in the selection bounds */}
			<mask id={id}>
				<rect width={NODE_WIDTH_PX + 10} height={height + 10} fill="white" x={-5} y={-5} />
				{Object.values(ports).map((port) => (
					<circle
						key={port.id}
						cx={port.x}
						cy={port.y}
						r={PORT_RADIUS_PX}
						fill="black"
						strokeWidth={0}
					/>
				))}
			</mask>
			<rect rx={9} width={NODE_WIDTH_PX} height={height} mask={`url(#${id})`} />
			{Object.values(ports).map((port) => (
				<circle key={port.id} cx={port.x} cy={port.y} r={PORT_RADIUS_PX} />
			))}
		</>
	)
}

// Main node component that renders the HTML content
function NodeShape({ shape }: { shape: NodeShape }) {
	const editor = useEditor()

	// Check if this node is currently executing using our execution state
	const isExecuting = useValue(
		'is executing',
		() => executionState.get(editor).runningGraph?.getNodeStatus(shape.id) === 'executing',
		[editor, shape.id]
	)

	return (
		<HTMLContainer
			className={classNames('NodeShape', {
				NodeShape_executing: isExecuting,
			})}
			style={{
				width: getNodeWidthPx(shape.props.node, editor),
				height: getNodeHeightPx(shape.props.node, editor),
			}}
		>
			<NodeBody shape={shape} />
			<NodePorts shape={shape} />
		</HTMLContainer>
	)
}
