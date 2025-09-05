import { Editor, T, TLUiIconJsx } from 'tldraw'
import { NODE_HEIGHT_PX, NODE_WIDTH_PX } from '../../constants'
import { PortId, ShapePort } from '../../ports/Port'
import { NodeShape } from '../NodeShapeUtil'
import { NodeType, NodeTypePorts } from '../nodeTypes'

/**
 * A special value that can be returned from a node to indicate that execution should stop.
 */
export type STOP_EXECUTION = typeof STOP_EXECUTION
export const STOP_EXECUTION = Symbol('STOP_EXECUTION')

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
	computeOutput: (
		node: Node,
		inputs: Record<string, any>
	) => Promise<Record<string, any | STOP_EXECUTION>>
	onPortConnect?: (editor: Editor, shape: NodeShape, node: Node, port: PortId) => void
	onPortDisconnect?: (editor: Editor, shape: NodeShape, node: Node, port: PortId) => void
	Component: React.ComponentType<{ shape: NodeShape; node: Node }>
}

export const shapeInputPort: ShapePort = {
	id: 'input',
	terminal: 'end',
	x: NODE_WIDTH_PX / 2,
	y: 0,
}

/**
 * The standard output port for a node, appearing in the node header.
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

/**
 * A value within a node. If the value is STOP_EXECUTION, a placeholder is shown instead.
 */
export function NodeValue({ value }: { value: number | STOP_EXECUTION }) {
	if (value === STOP_EXECUTION) {
		return <div className="NodeValue_placeholder" />
	}

	return value
}
