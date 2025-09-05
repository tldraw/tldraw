import { Editor, T, useEditor, useValue } from 'tldraw'
import { Port, PortId, shapePort } from '../ports/Port'
import { NodeShape } from './NodeShapeUtil'
import { MessageNode } from './types/MessageNode'
import { NodeDefinition, STOP_EXECUTION } from './types/shared'

/** All our node types */
export const NodeDefinitions = [MessageNode] as const

const NodeDefinitionMap = Object.fromEntries(NodeDefinitions.map((type) => [type.type, type])) as {
	[NodeDefinition in (typeof NodeDefinitions)[number] as NodeDefinition['type']]: NodeDefinition
}

/**
 * A union type of all our node types.
 */
export type NodeType = T.TypeOf<typeof NodeType>
export const NodeType = T.union(
	'type',
	Object.fromEntries(NodeDefinitions.map((type) => [type.type, type.validator])) as {
		[NodeDefinition in (typeof NodeDefinitions)[number] as NodeDefinition['type']]: NodeDefinition['validator']
	}
)

// the other functions in this file are wrappers around the node definitions, dispatching to the
// correct definition for a given node.

export function getNodeDefinition(node: NodeType | NodeType['type']): NodeDefinition<NodeType> {
	return NodeDefinitionMap[typeof node === 'string' ? node : node.type] as NodeDefinition<NodeType>
}

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

export const nodeTypePorts = T.dict(T.string, shapePort)

export type NodeTypePorts = T.TypeOf<typeof nodeTypePorts>

export function getNodeTypePorts(node: NodeType, editor: Editor): NodeTypePorts {
	return getNodeDefinition(node).getPorts(node, editor)
}

export async function computeNodeOutput(
	node: NodeType,
	inputs: Record<string, any>
): Promise<Record<string, any | STOP_EXECUTION>> {
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
export function NodePorts({ shape }: { shape: NodeShape }) {
	const editor = useEditor()
	const ports = useValue('node ports', () => getNodeTypePorts(shape.props.node, editor), [
		shape.props.node,
		editor,
	])
	return (
		<>
			{Object.values(ports).map((port) => (
				<Port key={port.id} shapeId={shape.id} port={port} />
			))}
		</>
	)
}
