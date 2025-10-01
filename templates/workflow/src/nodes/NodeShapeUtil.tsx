import classNames from 'classnames'
import {
	Circle2d,
	Group2d,
	HTMLContainer,
	RecordProps,
	Rectangle2d,
	resizeBox,
	ShapeUtil,
	T,
	TLBaseShape,
	TLResizeInfo,
	useEditor,
	useUniqueSafeId,
	useValue,
} from 'tldraw'
import { NODE_WIDTH_PX, PORT_RADIUS_PX } from '../constants'
import { executionState } from '../execution/executionState'
import { Port, ShapePort } from '../ports/Port'
import { getNodeOutputPortInfo, getNodePorts } from './nodePorts'
import { getNodeDefinition, getNodeHeightPx, NodeBody, NodeType } from './nodeTypes'
import { NodeValue, STOP_EXECUTION } from './types/shared'

// Define our custom node shape type that extends tldraw's base shape system
export type NodeShape = TLBaseShape<'node', { node: NodeType; isOutOfDate: boolean }>

// This class extends tldraw's ShapeUtil to define how our custom node shapes behave
export class NodeShapeUtil extends ShapeUtil<NodeShape> {
	static override type = 'node' as const
	static override props: RecordProps<NodeShape> = {
		node: NodeType,
		isOutOfDate: T.boolean,
	}

	getDefaultProps(): NodeShape['props'] {
		return {
			node: getNodeDefinition(this.editor, 'add').getDefault(),
			isOutOfDate: false,
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
					excludeFromShapeBounds: true,
				})
		)

		const bodyGeometry = new Rectangle2d({
			width: NODE_WIDTH_PX,
			height: getNodeHeightPx(this.editor, shape),
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
		const ports = Object.values(getNodePorts(this.editor, shape))
		return <NodeShapeIndicator shape={shape} ports={ports} />
	}
}

// SVG indicator component that shows selection bounds and ports
function NodeShapeIndicator({ shape, ports }: { shape: NodeShape; ports: ShapePort[] }) {
	const id = useUniqueSafeId()
	const editor = useEditor()

	return (
		<>
			{/* Create a mask to show ports as holes in the selection bounds */}
			<mask id={id}>
				<rect
					width={NODE_WIDTH_PX + 10}
					height={getNodeHeightPx(editor, shape) + 10}
					fill="white"
					x={-5}
					y={-5}
				/>
				{ports.map((port) => (
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
			<rect
				rx={9}
				width={NODE_WIDTH_PX}
				height={getNodeHeightPx(editor, shape)}
				mask={`url(#${id})`}
			/>
			{ports.map((port) => (
				<circle key={port.id} cx={port.x} cy={port.y} r={PORT_RADIUS_PX} />
			))}
		</>
	)
}

// Main node component that renders the HTML content
function NodeShape({ shape }: { shape: NodeShape }) {
	const editor = useEditor()

	// Get the node's output value
	const output = useValue(
		'output',
		() => getNodeOutputPortInfo(editor, shape.id)?.output ?? undefined,
		[editor, shape.id]
	)

	// Check if this node is currently executing using our execution state
	const isExecuting = useValue(
		'is executing',
		() => executionState.get(editor).runningGraph?.getNodeStatus(shape.id) === 'executing',
		[editor, shape.id]
	)

	const nodeDefinition = getNodeDefinition(editor, shape.props.node)

	return (
		<HTMLContainer
			className={classNames('NodeShape', {
				NodeShape_executing: isExecuting,
			})}
		>
			<div className="NodeShape-heading">
				<div className="NodeShape-label">{nodeDefinition.heading ?? nodeDefinition.title}</div>
				{output !== undefined && (
					<>
						<div className="NodeShape-output">
							<NodeValue value={output.isOutOfDate ? STOP_EXECUTION : output.value} />
						</div>
						<Port shapeId={shape.id} portId="output" />
					</>
				)}
			</div>
			<NodeBody shape={shape} />
		</HTMLContainer>
	)
}
