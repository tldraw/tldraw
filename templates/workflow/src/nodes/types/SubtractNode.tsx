import { sleep, T, useEditor } from 'tldraw'
import { SubtractIcon } from '../../components/icons/SubtractIcon'
import { NODE_ROW_HEIGHT_PX } from '../../constants'
import { ShapePort } from '../../ports/Port'
import { NodeShape } from '../NodeShapeUtil'
import {
	areAnyInputsOutOfDate,
	ExecutionResult,
	InfoValues,
	InputValues,
	NodeComponentProps,
	NodeDefinition,
	NodeInputRow,
	outputPort,
	rowPort,
	updateNode,
} from './shared'

/**
 * The subtract node subtracts its two inputs.
 */
export type SubtractNode = T.TypeOf<typeof SubtractNode>
export const SubtractNode = T.object({
	type: T.literal('subtract'),
	a: T.number,
	b: T.number,
	lastResult: T.number.nullable(),
})

export class SubtractNodeDefinition extends NodeDefinition<SubtractNode> {
	static type = 'subtract'
	static validator = SubtractNode
	title = 'Subtract'
	heading = 'Subtract'
	icon = <SubtractIcon />
	getDefault(): SubtractNode {
		return {
			type: 'subtract',
			a: 0,
			b: 0,
			lastResult: null,
		}
	}
	getBodyHeightPx(_shape: NodeShape, _node: SubtractNode) {
		return NODE_ROW_HEIGHT_PX * 2
	}
	getPorts(_shape: NodeShape, _node: SubtractNode): Record<string, ShapePort> {
		return {
			output: outputPort,
			minuend: rowPort('minuend', 0),
			subtrahend: rowPort('subtrahend', 1),
		}
	}
	async execute(
		shape: NodeShape,
		node: SubtractNode,
		inputs: InputValues
	): Promise<ExecutionResult> {
		await sleep(1000)

		const result = (inputs.minuend ?? node.a) - (inputs.subtrahend ?? node.b)
		updateNode<SubtractNode>(this.editor, shape, (node) => ({
			...node,
			lastResult: result,
		}))
		return {
			output: result,
		}
	}
	getOutputInfo(shape: NodeShape, node: SubtractNode, inputs: InfoValues): InfoValues {
		return {
			output: {
				value: node.lastResult ?? 0,
				isOutOfDate: areAnyInputsOutOfDate(inputs) || shape.props.isOutOfDate,
			},
		}
	}
	Component = SubtractNodeComponent
}

export function SubtractNodeComponent({ shape, node }: NodeComponentProps<SubtractNode>) {
	const editor = useEditor()
	return (
		<>
			<NodeInputRow
				shapeId={shape.id}
				portId="minuend"
				value={node.a}
				onChange={(newValue) =>
					updateNode<SubtractNode>(editor, shape, (node) => ({ ...node, a: newValue }))
				}
			/>
			<NodeInputRow
				shapeId={shape.id}
				portId="subtrahend"
				value={node.b}
				onChange={(newValue) =>
					updateNode<SubtractNode>(editor, shape, (node) => ({ ...node, b: newValue }))
				}
			/>
		</>
	)
}
