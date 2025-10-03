import { T, useEditor } from 'tldraw'
import { MultiplyIcon } from '../../components/icons/MultiplyIcon'
import {
	NODE_HEADER_HEIGHT_PX,
	NODE_ROW_HEADER_GAP_PX,
	NODE_ROW_HEIGHT_PX,
	NODE_WIDTH_PX,
} from '../../constants'
import { ShapePort } from '../../ports/Port'
import { sleep } from '../../utils/sleep'
import { NodeShape } from '../NodeShapeUtil'
import {
	areAnyInputsOutOfDate,
	ExecutionResult,
	InfoValues,
	InputValues,
	NodeComponentProps,
	NodeDefinition,
	NodeInputRow,
	updateNode,
} from './shared'

/**
 * The multiply node multiplies its two inputs.
 */
export type MultiplyNode = T.TypeOf<typeof MultiplyNode>
export const MultiplyNode = T.object({
	type: T.literal('multiply'),
	a: T.number,
	b: T.number,
	lastResult: T.number.nullable(),
})

export class MultiplyNodeDefinition extends NodeDefinition<MultiplyNode> {
	static type = 'multiply'
	static validator = MultiplyNode
	title = 'Multiply'
	heading = 'Multiply'
	icon = (<MultiplyIcon />)
	getDefault(): MultiplyNode {
		return {
			type: 'multiply',
			a: 0,
			b: 0,
			lastResult: null,
		}
	}
	getBodyHeightPx(_shape: NodeShape, _node: MultiplyNode) {
		return NODE_ROW_HEIGHT_PX * 2
	}
	getPorts(_shape: NodeShape, _node: MultiplyNode): Record<string, ShapePort> {
		return {
			output: {
				id: 'output',
				x: NODE_WIDTH_PX,
				y: NODE_HEADER_HEIGHT_PX / 2,
				terminal: 'start',
			},
			multiplicand: {
				id: 'multiplicand',
				x: 0,
				y: NODE_HEADER_HEIGHT_PX + NODE_ROW_HEADER_GAP_PX + NODE_ROW_HEIGHT_PX / 2,
				terminal: 'end',
			},
			multiplier: {
				id: 'multiplier',
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
	async execute(
		shape: NodeShape,
		node: MultiplyNode,
		inputs: InputValues
	): Promise<ExecutionResult> {
		await sleep(1000)

		const result = (inputs.multiplicand ?? node.a) * (inputs.multiplier ?? node.b)
		updateNode<MultiplyNode>(this.editor, shape, (node) => ({
			...node,
			lastResult: result,
		}))
		return {
			output: result,
		}
	}
	getOutputInfo(shape: NodeShape, node: MultiplyNode, inputs: InfoValues): InfoValues {
		return {
			output: {
				value: node.lastResult ?? 0,
				isOutOfDate: areAnyInputsOutOfDate(inputs) || shape.props.isOutOfDate,
			},
		}
	}
	Component = MultiplyNodeComponent
}

export function MultiplyNodeComponent({ shape, node }: NodeComponentProps<MultiplyNode>) {
	const editor = useEditor()
	return (
		<>
			<NodeInputRow
				shapeId={shape.id}
				portId="multiplicand"
				value={node.a}
				onChange={(newValue) =>
					updateNode<MultiplyNode>(editor, shape, (node) => ({ ...node, a: newValue }))
				}
			/>
			<NodeInputRow
				shapeId={shape.id}
				portId="multiplier"
				value={node.b}
				onChange={(newValue) =>
					updateNode<MultiplyNode>(editor, shape, (node) => ({ ...node, b: newValue }))
				}
			/>
		</>
	)
}
