import { Editor, T, TLUiIconJsx } from 'tldraw'
import { NODE_HEIGHT_PX, NODE_WIDTH_PX } from '../../constants'
import { PortId, ShapePort } from '../../ports/Port'
import { NodeShape } from '../NodeShapeUtil'
import { NodeType, NodeTypePorts } from '../nodeTypes'

export interface NodeDefinition<Node extends { type: string }> {
	type: Node['type']
	validator: T.Validator<Node>
	title: string
	heading?: string
	icon: TLUiIconJsx
	getDefault: () => Node
	getBodyWidthPx: (node: Node, editor: Editor) => number
	getBodyHeightPx: (node: Node, editor: Editor) => number
	getPorts: (node: Node, editor: Editor) => NodeTypePorts
	computeOutput: (node: Node, inputs: Record<string, any>) => Promise<Record<string, any>>
	onPortConnect?: (editor: Editor, shape: NodeShape, node: Node, port: PortId) => void
	onPortDisconnect?: (editor: Editor, shape: NodeShape, node: Node, port: PortId) => void
	Component: React.ComponentType<{ shape: NodeShape; node: Node }>
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
	editor.updateShape({
		id: shape.id,
		type: shape.type,
		props: { node: update(shape.props.node as T) },
	})
}
