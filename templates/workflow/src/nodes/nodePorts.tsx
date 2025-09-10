/**
 * This file contains functions for working with ports and connections on nodes.
 */
import { createComputedCache, Editor, TLShapeId } from 'tldraw'
import { ConnectionBinding, getConnectionBindings } from '../connection/ConnectionBindingUtil'
import { PortId } from '../ports/Port'
import { NodeShape } from './NodeShapeUtil'
import { getNodeOutputInfo, getNodeTypePorts } from './nodeTypes'
import { areAnyInputsOutOfDate, InfoValues, STOP_EXECUTION } from './types/shared'

/**
 * Get the ports for a node. This is cached, because we only want to re-evaluate it when the
 * underlying records change.
 */
export function getNodePorts(editor: Editor, shape: NodeShape | TLShapeId) {
	return nodePortsCache.get(editor, typeof shape === 'string' ? shape : shape.id) ?? {}
}
const nodePortsCache = createComputedCache('ports', (editor: Editor, node: NodeShape) =>
	getNodeTypePorts(editor, node)
)

/**
 * A connection from one node to another.
 */
export interface NodePortConnection {
	connectedShapeId: TLShapeId
	connectionId: TLShapeId
	terminal: 'start' | 'end'
	ownPortId: PortId
	connectedPortId: PortId
}

/**
 * Get the connections for a node. This is cached.
 */
export function getNodePortConnections(
	editor: Editor,
	shape: NodeShape | TLShapeId
): NodePortConnection[] {
	return nodePortConnectionsCache.get(editor, typeof shape === 'string' ? shape : shape.id) ?? []
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

/**
 * Get the values of the input ports for a node. This is cached.
 */
export function getNodeInputPortValues(editor: Editor, shape: NodeShape | TLShapeId): InfoValues {
	return nodeInputPortValuesCache.get(editor, typeof shape === 'string' ? shape : shape.id) ?? {}
}
const nodeInputPortValuesCache = createComputedCache(
	'node input port values',
	(editor: Editor, node: NodeShape) => {
		const connections = getNodePortConnections(editor, node)

		const values: InfoValues = {}
		for (const connection of connections) {
			if (!connection || connection.terminal !== 'end') continue

			const connectedShapeOutputs = getNodeOutputPortInfo(editor, connection.connectedShapeId)
			if (!connectedShapeOutputs) {
				continue
			}

			const output = connectedShapeOutputs[connection.connectedPortId]
			values[connection.ownPortId] = output
		}

		return values
	},
	{
		areRecordsEqual: (a, b) => a.props === b.props,
	}
)

/**
 * Get the values of the output ports for a node. This is cached.
 */
export function getNodeOutputPortInfo(editor: Editor, shape: NodeShape | TLShapeId): InfoValues {
	return nodeOutputPortInfoCache.get(editor, typeof shape === 'string' ? shape : shape.id) ?? {}
}
const nodeOutputPortInfoCache = createComputedCache(
	'node output port info',
	(editor: Editor, node: NodeShape): InfoValues => {
		const inputs = getNodeInputPortValues(editor, node)
		if (Object.values(inputs).some((input) => input.value === STOP_EXECUTION)) {
			return Object.fromEntries(
				Object.values(getNodePorts(editor, node))
					.filter((port) => port.terminal === 'start')
					.map((port) => [
						port.id,
						{ value: STOP_EXECUTION, isOutOfDate: areAnyInputsOutOfDate(inputs) },
					])
			)
		}

		return getNodeOutputInfo(editor, node, inputs as InfoValues)
	},
	{
		areRecordsEqual: (a, b) => a.props === b.props,
	}
)

/**
 * Traverse the graph from a starting node, in a given direction, returning all the nodes that are
 * connected to it (including the starting node).
 */
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
