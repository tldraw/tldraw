import { Editor, T, WeakCache } from 'tldraw'
import { PortId, shapePort } from '../ports/Port'
import { NodeShape } from './NodeShapeUtil'
import { MessageNodeDefinition } from './types/MessageNode'
import { NodeDefinition, NodeDefinitionConstructor } from './types/shared'

/** All our node types */
export const NodeDefinitions = {
	message: MessageNodeDefinition,
} satisfies Record<string, NodeDefinitionConstructor<any>>

const nodeDefinitions = new WeakCache<
	Editor,
	{ [K in keyof typeof NodeDefinitions]: InstanceType<(typeof NodeDefinitions)[K]> }
>()
export function getNodeDefinitions(editor: Editor) {
	return nodeDefinitions.get(editor, () => {
		return Object.fromEntries(
			Object.values(NodeDefinitions).map((value) => [value.type, new value(editor)])
		) as any
	})
}

export function getNodeDefinition(
	editor: Editor,
	node: NodeType | NodeType['type']
): NodeDefinition<NodeType> {
	return getNodeDefinitions(editor)[
		typeof node === 'string' ? node : node.type
	] as NodeDefinition<NodeType>
}

/**
 * A union type of all our node types.
 */
export type NodeType = T.TypeOf<typeof NodeType>
export const NodeType = T.union(
	'type',
	Object.fromEntries(Object.values(NodeDefinitions).map((type) => [type.type, type.validator])) as {
		[K in keyof typeof NodeDefinitions as (typeof NodeDefinitions)[K]['type']]: (typeof NodeDefinitions)[K]['validator']
	}
)

export function getNodeBodyHeightPx(editor: Editor, shape: NodeShape): number {
	return getNodeDefinition(editor, shape.props.node).getBodyHeightPx(shape, shape.props.node)
}

export function getNodeBodyWidthPx(editor: Editor, shape: NodeShape): number {
	return getNodeDefinition(editor, shape.props.node).getBodyWidthPx(shape, shape.props.node)
}

export function getNodeHeightPx(editor: Editor, shape: NodeShape): number {
	return getNodeBodyHeightPx(editor, shape)
}

export function getNodeWidthPx(editor: Editor, shape: NodeShape): number {
	return getNodeBodyWidthPx(editor, shape)
}

const _nodeTypePorts = T.dict(T.string, shapePort)
export type NodeTypePorts = T.TypeOf<typeof _nodeTypePorts>

export function getNodeTypePorts(editor: Editor, shape: NodeShape): NodeTypePorts {
	return getNodeDefinition(editor, shape.props.node).getPorts(shape, shape.props.node)
}

export function onNodePortConnect(editor: Editor, shape: NodeShape, port: PortId) {
	getNodeDefinition(editor, shape.props.node).onPortConnect?.(shape, shape.props.node, port)
}

export function onNodePortDisconnect(editor: Editor, shape: NodeShape, port: PortId) {
	getNodeDefinition(editor, shape.props.node).onPortDisconnect?.(shape, shape.props.node, port)
}
