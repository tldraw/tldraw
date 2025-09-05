import { Editor, T } from 'tldraw'
import { PortId, shapePort } from '../ports/Port'
import { NodeShape } from './NodeShapeUtil'
import { MessageNode } from './types/MessageNode'
import { NodeDefinition } from './types/shared'

/** All our node types */
export const NodeDefinitions = [MessageNode] as const

const NodeDefinitionMap = Object.fromEntries(NodeDefinitions.map((type) => [type.type, type])) as {
	[NodeDefinition in (typeof NodeDefinitions)[number] as NodeDefinition['type']]: NodeDefinition
}

export function getNodeDefinition(node: NodeType | NodeType['type']): NodeDefinition<NodeType> {
	return NodeDefinitionMap[typeof node === 'string' ? node : node.type] as NodeDefinition<NodeType>
}

export type NodeType = T.TypeOf<typeof NodeType>
export const NodeType = T.union(
	'type',
	Object.fromEntries(NodeDefinitions.map((type) => [type.type, type.validator])) as {
		[NodeDefinition in (typeof NodeDefinitions)[number] as NodeDefinition['type']]: NodeDefinition['validator']
	}
)

export function getNodeBodyHeightPx(node: NodeType, editor: Editor): number {
	return getNodeDefinition(node).getBodyHeightPx(node, editor)
}

export function getNodeBodyWidthPx(node: NodeType, editor: Editor): number {
	return getNodeDefinition(node).getBodyWidthPx(node, editor)
}

export function getNodeHeightPx(node: NodeType, editor: Editor): number {
	return getNodeBodyHeightPx(node, editor)
}

export function getNodeWidthPx(node: NodeType, editor: Editor): number {
	return getNodeBodyWidthPx(node, editor)
}

const _nodeTypePorts = T.dict(T.string, shapePort)
export type NodeTypePorts = T.TypeOf<typeof _nodeTypePorts>

export function getNodeTypePorts(node: NodeType, editor: Editor): NodeTypePorts {
	return getNodeDefinition(node).getPorts(node, editor)
}

export function onNodePortConnect(editor: Editor, shape: NodeShape, port: PortId) {
	getNodeDefinition(shape.props.node).onPortConnect?.(editor, shape, shape.props.node, port)
}

export function onNodePortDisconnect(editor: Editor, shape: NodeShape, port: PortId) {
	getNodeDefinition(shape.props.node).onPortDisconnect?.(editor, shape, shape.props.node, port)
}
