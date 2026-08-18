import { sleep, T, useEditor } from 'tldraw'
import { MultiplyIcon } from '../../components/icons/MultiplyIcon'
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
	icon = <MultiplyIcon />
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
			output: outputPort,
			multiplicand: rowPort('multiplicand', 0),
			multiplier: rowPort('multiplier', 1),
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
