import { T, useEditor } from 'tldraw'
import { SubtractIcon } from '../../components/icons/SubtractIcon'
import { NODE_HEADER_HEIGHT_PX, NODE_ROW_HEADER_GAP_PX, NODE_ROW_HEIGHT_PX } from '../../constants'
import { NodeDefinition, NodeInputRow, outputPort, updateNode } from './shared'

/**
 * The subtract node subtracts its two inputs.
 */
export type SubtractNode = T.TypeOf<typeof SubtractNodeType>
export const SubtractNodeType = T.object({
	type: T.literal('subtract'),
	a: T.number,
	b: T.number,
})

export const SubtractNode: NodeDefinition<SubtractNode> = {
	type: 'subtract',
	validator: SubtractNodeType,
	title: 'Subtract',
	icon: <SubtractIcon />,
	getDefault: () => ({
		type: 'subtract',
		a: 0,
		b: 0,
	}),
	getBodyHeightPx: () => NODE_ROW_HEIGHT_PX * 2,
	getPorts: () => ({
		output: outputPort,
		minuend: {
			id: 'minuend',
			x: 0,
			y: NODE_HEADER_HEIGHT_PX + NODE_ROW_HEADER_GAP_PX + NODE_ROW_HEIGHT_PX / 2,
			terminal: 'end',
		},
		subtrahend: {
			id: 'subtrahend',
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
		output: (inputs.minuend ?? node.a) - (inputs.subtrahend ?? node.b),
	}),
	Component: ({ shape, node }) => {
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
	},
}
