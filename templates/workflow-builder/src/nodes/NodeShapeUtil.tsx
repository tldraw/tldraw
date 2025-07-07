import {
	areObjectsShallowEqual,
	Circle2d,
	createComputedCache,
	Editor,
	Group2d,
	HTMLContainer,
	RecordProps,
	Rectangle2d,
	resizeBox,
	ShapeUtil,
	TLBaseShape,
	TLResizeInfo,
	TLShapeId,
	useEditor,
	useUniqueSafeId,
	useValue,
} from 'tldraw'
import { ConnectionBinding, getConnectionBindings } from '../connection/ConnectionBindingUtil'
import { Port, PORT_RADIUS_PX, ShapePort } from '../ports/Port'
import { PortId } from '../ports/portState'
import {
	computeNodeOutput,
	getNodeBodyHeightPx,
	getNodeTypePorts,
	NODE_HEADER_HEIGHT_PX,
	NODE_WIDTH_PX,
	NodeBody,
	NodeType,
} from './nodeTypes'

export type NodeShape = TLBaseShape<'node', { node: NodeType }>

export class NodeShapeUtil extends ShapeUtil<NodeShape> {
	static override type = 'node' as const
	static override props: RecordProps<NodeShape> = {
		node: NodeType,
	}

	getDefaultProps(): NodeShape['props'] {
		return {
			node: {
				type: 'add',
				items: [0, 0],
			},
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

	getGeometry(shape: NodeShape) {
		const ports = getNodePorts(this.editor, shape)

		const portGeometries = Object.values(ports).map(
			(port) =>
				new Circle2d({
					x: port.x - PORT_RADIUS_PX,
					y: port.y - PORT_RADIUS_PX,
					radius: PORT_RADIUS_PX,
					isFilled: true,
				})
		)

		const bodyGeometry = new Rectangle2d({
			width: NODE_WIDTH_PX,
			height: NODE_HEADER_HEIGHT_PX + getNodeBodyHeightPx(shape.props.node),
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

function NodeShapeIndicator({ shape, ports }: { shape: NodeShape; ports: ShapePort[] }) {
	const id = useUniqueSafeId()

	return (
		<>
			<mask id={id}>
				<rect
					width={NODE_WIDTH_PX + 10}
					height={NODE_HEADER_HEIGHT_PX + getNodeBodyHeightPx(shape.props.node) + 10}
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
				rx={6}
				width={NODE_WIDTH_PX}
				height={NODE_HEADER_HEIGHT_PX + getNodeBodyHeightPx(shape.props.node)}
				mask={`url(#${id})`}
			/>
			{ports.map((port) => (
				<circle key={port.id} cx={port.x} cy={port.y} r={PORT_RADIUS_PX} />
			))}
		</>
	)
}

function NodeShape({ shape }: { shape: NodeShape }) {
	const editor = useEditor()
	const output = useValue('output', () => getNodeOutputPortValues(editor, shape.id)?.output, [
		editor,
		shape.id,
	])

	return (
		<HTMLContainer
			className="NodeShape"
			style={{
				width: NODE_WIDTH_PX,
				height: NODE_HEADER_HEIGHT_PX + getNodeBodyHeightPx(shape.props.node),
				pointerEvents: 'all',
			}}
		>
			<div className="NodeShape-heading">
				<div className="NodeShape-label">{shape.props.node.type}</div>
				<div className="NodeShape-output">{output}</div>
				<Port shapeId={shape.id} portId="output" />
			</div>
			<NodeBody shape={shape} />
		</HTMLContainer>
	)
}

const nodePortsCache = createComputedCache('ports', (_editor: Editor, node: NodeShape) =>
	getNodeTypePorts(node.props.node)
)

export function getNodePorts(editor: Editor, shape: NodeShape | TLShapeId) {
	return nodePortsCache.get(editor, typeof shape === 'string' ? shape : shape.id) ?? {}
}

export interface NodePortConnection {
	connectedShapeId: TLShapeId
	connectionId: TLShapeId
	terminal: 'start' | 'end'
	ownPortId: PortId
	connectedPortId: PortId
}
const nodePortConnectionsCache = createComputedCache(
	'port connections',
	(editor: Editor, node: NodeShape) => {
		const bindings = editor.getBindingsToShape<ConnectionBinding>(node.id, 'connection')

		const connections: Record<string, NodePortConnection> = {}
		for (const binding of bindings) {
			const oppositeBinding = getConnectionBindings(editor, binding.fromId).start
			if (!oppositeBinding) continue

			connections[binding.props.portId] = {
				connectedShapeId: oppositeBinding.toId,
				connectionId: binding.fromId,
				terminal: binding.props.terminal,
				ownPortId: binding.props.portId,
				connectedPortId: oppositeBinding.props.portId,
			}
		}

		return connections
	},
	{
		areRecordsEqual: (a, b) => a.id === b.id,
	}
)

export function getNodePortConnections(
	editor: Editor,
	shape: NodeShape | TLShapeId
): { [K in PortId]?: NodePortConnection } {
	return nodePortConnectionsCache.get(editor, typeof shape === 'string' ? shape : shape.id) ?? {}
}

const nodeInputPortValuesCache = createComputedCache(
	'node input port values',
	(editor: Editor, node: NodeShape) => {
		const connections = getNodePortConnections(editor, node)

		const values: Record<string, number> = {}
		for (const connection of Object.values(connections)) {
			if (!connection || connection.terminal !== 'end') continue

			const connectedShapeOutputs = getNodeOutputPortValues(editor, connection.connectedShapeId)
			if (!connectedShapeOutputs || connectedShapeOutputs[connection.connectedPortId] == null) {
				continue
			}

			values[connection.ownPortId] = connectedShapeOutputs[connection.connectedPortId]
		}

		return values
	},
	{
		areRecordsEqual: (a, b) => a.id === b.id,
		areResultsEqual: areObjectsShallowEqual,
	}
)

export function getNodeInputPortValues(
	editor: Editor,
	shape: NodeShape | TLShapeId
): Record<string, number> {
	return nodeInputPortValuesCache.get(editor, typeof shape === 'string' ? shape : shape.id) ?? {}
}

const nodeOutputPortValuesCache = createComputedCache(
	'node output port values',
	(editor: Editor, node: NodeShape) => {
		const inputs = getNodeInputPortValues(editor, node)
		console.log('computing node output port values', node.id, node.props.node, inputs)
		return computeNodeOutput(node.props.node, inputs)
	},
	{
		areRecordsEqual: (a, b) => a.id === b.id && a.props.node === b.props.node,
		// the results should stay the same:
		areResultsEqual: areObjectsShallowEqual,
	}
)

export function getNodeOutputPortValues(
	editor: Editor,
	shape: NodeShape | TLShapeId
): Record<string, number> {
	return nodeOutputPortValuesCache.get(editor, typeof shape === 'string' ? shape : shape.id) ?? {}
}
