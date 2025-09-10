import { T, useEditor } from 'tldraw'
import { DivideIcon } from '../../components/icons/DivideIcon'
import {
	NODE_HEADER_HEIGHT_PX,
	NODE_ROW_HEADER_GAP_PX,
	NODE_ROW_HEIGHT_PX,
	NODE_WIDTH_PX,
} from '../../constants'
import { ShapePort } from '../../ports/Port'
import { NodeShape } from '../NodeShapeUtil'
import {
	ExecutionResult,
	InfoValues,
	InputValues,
	NodeComponentProps,
	NodeDefinition,
	NodeInputRow,
	updateNode,
} from './shared'

/**
 * The divide node divides its two inputs.
 */
export type DivideNode = T.TypeOf<typeof DivideNode>
export const DivideNode = T.object({
	type: T.literal('divide'),
	a: T.number,
	b: T.number,
})

export class DivideNodeType extends NodeDefinition<DivideNode> {
	static type = 'divide'
	static validator = DivideNode
	title = 'Divide'
	heading = 'Divide'
	icon = (<DivideIcon />)
	getDefault(): DivideNode {
		return {
			type: 'divide',
			a: 0,
			b: 0,
		}
	}
	getBodyHeightPx(_shape: NodeShape, _node: DivideNode) {
		return NODE_ROW_HEIGHT_PX * 2
	}
	getPorts(_shape: NodeShape, _node: DivideNode): Record<string, ShapePort> {
		return {
			output: {
				id: 'output',
				x: NODE_WIDTH_PX,
				y: NODE_HEADER_HEIGHT_PX / 2,
				terminal: 'start',
			},
			dividend: {
				id: 'dividend',
				x: 0,
				y: NODE_HEADER_HEIGHT_PX + NODE_ROW_HEADER_GAP_PX + NODE_ROW_HEIGHT_PX / 2,
				terminal: 'end',
			},
			divisor: {
				id: 'divisor',
				x: 0,
				y:
					NODE_HEADER_HEIGHT_PX +
					NODE_ROW_HEADER_GAP_PX +
					NODE_ROW_HEIGHT_PX +
					NODE_ROW_HEIGHT_PX / 2,
				terminal: 'end',
			},
		}
	}
	async execute(shape: NodeShape, node: DivideNode, inputs: InputValues): Promise<ExecutionResult> {
		return {
			output: (inputs.dividend ?? node.a) / (inputs.divisor ?? node.b),
		}
	}
	getOutputInfo(_shape: NodeShape, _node: DivideNode, _inputs: InfoValues): InfoValues {
		return {}
	}
	Component = DivideNodeComponent
}

export function DivideNodeComponent({ shape, node }: NodeComponentProps<DivideNode>) {
	const editor = useEditor()
	return (
		<>
			<NodeInputRow
				shapeId={shape.id}
				portId="dividend"
				value={node.a}
				onChange={(newValue) =>
					updateNode<DivideNode>(editor, shape, (node) => ({ ...node, a: newValue }))
				}
			/>
			<NodeInputRow
				shapeId={shape.id}
				portId="divisor"
				value={node.b}
				onChange={(newValue) =>
					updateNode<DivideNode>(editor, shape, (node) => ({ ...node, b: newValue }))
				}
			/>
		</>
	)
}
