import { T, useEditor } from 'tldraw'
import { MultiplyIcon } from '../../components/icons/MultiplyIcon'
import { NODE_HEADER_HEIGHT_PX, NODE_ROW_HEADER_GAP_PX, NODE_ROW_HEIGHT_PX } from '../../constants'
import { NodeDefinition, NodeInputRow, outputPort, updateNode } from './shared'

export const MultiplyNodeType = T.object({
	type: T.literal('multiply'),
	a: T.number,
	b: T.number,
})
export type MultiplyNode = T.TypeOf<typeof MultiplyNodeType>

export const MultiplyNode: NodeDefinition<MultiplyNode> = {
	type: 'multiply',
	validator: MultiplyNodeType,
	title: 'Multiply',
	icon: <MultiplyIcon />,
	getDefault: () => ({
		type: 'multiply',
		a: 0,
		b: 0,
	}),
	getBodyHeightPx: () => NODE_ROW_HEIGHT_PX * 2,
	getPorts: () => ({
		output: outputPort,
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
	}),
	computeOutput: (node, inputs) => ({
		output: (inputs.multiplicand ?? node.a) * (inputs.multiplier ?? node.b),
	}),
	Component: ({ shape, node }) => {
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
	},
}
