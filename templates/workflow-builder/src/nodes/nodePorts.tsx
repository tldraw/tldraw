import { areObjectsShallowEqual, createComputedCache, Editor, TLShapeId } from 'tldraw'
import { ConnectionBinding, getConnectionBindings } from '../connection/ConnectionBindingUtil'
import { PortId } from '../ports/Port'
import { NodeShape } from './NodeShapeUtil'
import { computeNodeOutput, getNodeTypePorts } from './nodeTypes'
import { STOP_EXECUTION } from './types/shared'

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

		const connections: NodePortConnection[] = []
		for (const binding of bindings) {
			const oppositeTerminal = binding.props.terminal === 'start' ? 'end' : 'start'
			const oppositeBinding = getConnectionBindings(editor, binding.fromId)[oppositeTerminal]
			if (!oppositeBinding) continue

			connections.push({
				connectedShapeId: oppositeBinding.toId,
				connectionId: binding.fromId,
				terminal: binding.props.terminal,
				ownPortId: binding.props.portId,
				connectedPortId: oppositeBinding.props.portId,
			})
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
): NodePortConnection[] {
	return nodePortConnectionsCache.get(editor, typeof shape === 'string' ? shape : shape.id) ?? []
}

const nodeInputPortValuesCache = createComputedCache(
	'node input port values',
	(editor: Editor, node: NodeShape) => {
		const connections = getNodePortConnections(editor, node)

		const values: Record<string, number | STOP_EXECUTION> = {}
		for (const connection of connections) {
			if (!connection || connection.terminal !== 'end') continue

			const connectedShapeOutputs = getNodeOutputPortValues(editor, connection.connectedShapeId)
			if (!connectedShapeOutputs) {
				continue
			}

			const output = connectedShapeOutputs[connection.connectedPortId]
			values[connection.ownPortId] = output
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
): Record<string, number | STOP_EXECUTION> {
	return nodeInputPortValuesCache.get(editor, typeof shape === 'string' ? shape : shape.id) ?? {}
}

const nodeOutputPortValuesCache = createComputedCache(
	'node output port values',
	(editor: Editor, node: NodeShape): Record<string, number | STOP_EXECUTION> => {
		const inputs = getNodeInputPortValues(editor, node)
		if (Object.values(inputs).includes(STOP_EXECUTION)) {
			return Object.fromEntries(
				Object.values(getNodePorts(editor, node))
					.filter((port) => port.terminal === 'start')
					.map((port) => [port.id, STOP_EXECUTION])
			)
		}

		return computeNodeOutput(node.props.node, inputs as Record<string, number>)
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
): Record<string, number | STOP_EXECUTION> {
	return nodeOutputPortValuesCache.get(editor, typeof shape === 'string' ? shape : shape.id) ?? {}
}

export function getAllConnectedNodes(
	editor: Editor,
	startingNode: TLShapeId | NodeShape,
	direction?: 'start' | 'end'
) {
	const toVisit = [typeof startingNode === 'string' ? startingNode : startingNode.id]
	const found = new Set<TLShapeId>()

	while (toVisit.length > 0) {
		const nodeId = toVisit.shift()
		if (!nodeId) continue

		const node = editor.getShape(nodeId)
		if (!node || !editor.isShapeOfType<NodeShape>(node, 'node')) continue

		if (found.has(node.id)) continue
		found.add(node.id)

		for (const connection of getNodePortConnections(editor, node)) {
			if (direction && connection.terminal !== direction) continue
			toVisit.push(connection.connectedShapeId)
		}
	}

	return found
}
