import { Editor, T } from 'tldraw'
import {
	NODE_HEADER_HEIGHT_PX,
	NODE_ROW_BOTTOM_PADDING_PX,
	NODE_ROW_HEADER_GAP_PX,
} from '../constants'
import { PortId, ShapePort } from '../ports/Port'
import { NodeShape } from './NodeShapeUtil'
import { AddNode } from './types/AddNode'
import { DivideNode } from './types/DivideNode'
import { MultiplyNode } from './types/MultiplyNode'
import { NodeDefinition } from './types/shared'
import { SubtractNode } from './types/SubtractNode'

export const NodeDefinitions = [AddNode, SubtractNode, MultiplyNode, DivideNode] as const

const NodeDefinitionMap = Object.fromEntries(NodeDefinitions.map((type) => [type.type, type])) as {
	[NodeDefinition in (typeof NodeDefinitions)[number] as NodeDefinition['type']]: NodeDefinition
}

export const NodeType = T.union(
	'type',
	Object.fromEntries(NodeDefinitions.map((type) => [type.type, type.validator])) as {
		[NodeDefinition in (typeof NodeDefinitions)[number] as NodeDefinition['type']]: NodeDefinition['validator']
	}
)
export type NodeType = T.TypeOf<typeof NodeType>

export function getNodeDefinition(node: NodeType | NodeType['type']): NodeDefinition<NodeType> {
	return NodeDefinitionMap[typeof node === 'string' ? node : node.type] as NodeDefinition<NodeType>
}

export function getNodeBodyHeightPx(node: NodeType): number {
	return getNodeDefinition(node).getBodyHeightPx(node)
}

export function getNodeHeightPx(node: NodeType): number {
	return (
		NODE_HEADER_HEIGHT_PX +
		NODE_ROW_HEADER_GAP_PX +
		getNodeBodyHeightPx(node) +
		NODE_ROW_BOTTOM_PADDING_PX
	)
}

export function getNodeTypePorts(node: NodeType): Record<string, ShapePort> {
	return getNodeDefinition(node).getPorts(node)
}

export function computeNodeOutput(
	node: NodeType,
	inputs: Record<string, number>
): Record<string, number> {
	return getNodeDefinition(node).computeOutput(node, inputs)
}

export function onNodePortConnect(editor: Editor, shape: NodeShape, port: PortId) {
	getNodeDefinition(shape.props.node).onPortConnect?.(editor, shape, shape.props.node, port)
}

export function onNodePortDisconnect(editor: Editor, shape: NodeShape, port: PortId) {
	getNodeDefinition(shape.props.node).onPortDisconnect?.(editor, shape, shape.props.node, port)
}

export function NodeBody({ shape }: { shape: NodeShape }) {
	const node = shape.props.node
	const { Component } = getNodeDefinition(node)
	return <Component shape={shape} node={node} />
}
