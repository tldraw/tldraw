import { Editor, T, TLUiIconJsx } from 'tldraw'
import { NODE_HEIGHT_PX, NODE_WIDTH_PX } from '../../constants'
import { PortId, ShapePort } from '../../ports/Port'
import { NodeShape } from '../NodeShapeUtil'
import { NodeType, NodeTypePorts } from '../nodeTypes'

export interface NodeComponentProps<Node extends { type: string }> {
	shape: NodeShape
	node: Node
}

export abstract class NodeDefinition<Node extends { type: string }> {
	constructor(public readonly editor: Editor) {
		const ctor = this.constructor as NodeDefinitionConstructor<Node>
		this.type = ctor.type
		this.validator = ctor.validator
	}

	readonly type: Node['type']
	readonly validator: T.Validator<Node>
	abstract readonly title: string
	abstract readonly heading?: string
	abstract readonly icon: TLUiIconJsx

	abstract getDefault(): Node
	abstract getBodyWidthPx(shape: NodeShape, node: Node): number
	abstract getBodyHeightPx(shape: NodeShape, node: Node): number
	abstract getPorts(shape: NodeShape, node: Node): NodeTypePorts
	onPortConnect(_shape: NodeShape, _node: Node, _port: PortId): void {}
	onPortDisconnect(_shape: NodeShape, _node: Node, _port: PortId): void {}
	abstract Component: React.ComponentType<NodeComponentProps<Node>>
}

export interface NodeDefinitionConstructor<Node extends { type: string }> {
	new (editor: Editor): NodeDefinition<Node>
	readonly type: Node['type']
	readonly validator: T.Validator<Node>
}

/**
 * The standard input port for a node.
 */
export const shapeInputPort: ShapePort = {
	id: 'input',
	terminal: 'end',
	x: NODE_WIDTH_PX / 2,
	y: 0,
}

/**
 * The standard output port for a node.
 */
export const shapeOutputPort: ShapePort = {
	id: 'output',
	terminal: 'start',
	x: NODE_WIDTH_PX / 2,
	y: NODE_HEIGHT_PX,
}

/**
 * Update the `node` prop within a node shape.
 */
export function updateNode<T extends NodeType>(
	editor: Editor,
	shape: NodeShape,
	update: (node: T) => T
) {
	editor.updateShape<NodeShape>({
		id: shape.id,
		type: shape.type,
		props: { node: update(shape.props.node as T) },
	})
}
