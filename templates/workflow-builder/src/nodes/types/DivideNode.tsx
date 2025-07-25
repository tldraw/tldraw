import { T, useEditor } from 'tldraw'
import { DivideIcon } from '../../components/icons/Divide'
import { NODE_HEADER_HEIGHT_PX, NODE_ROW_HEADER_GAP_PX, NODE_ROW_HEIGHT_PX } from '../../constants'
import { NodeBodyRow, NodeDefinition, outputPort, updateNode } from './shared'

export const DivideNodeType = T.object({
	type: T.literal('divide'),
	a: T.number,
	b: T.number,
})
export type DivideNode = T.TypeOf<typeof DivideNodeType>

export const DivideNode: NodeDefinition<DivideNode> = {
	type: 'divide',
	validator: DivideNodeType,
	title: 'Divide',
	icon: <DivideIcon />,
	getDefault: () => ({
		type: 'divide',
		a: 0,
		b: 0,
	}),
	getBodyHeightPx: () => NODE_ROW_HEIGHT_PX * 2,
	getPorts: () => ({
		output: outputPort,
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
	}),
	computeOutput: (node, inputs) => ({
		output: (inputs.dividend ?? node.a) / (inputs.divisor ?? node.b),
	}),
	Component: ({ shape, node }) => {
		const editor = useEditor()
		return (
			<>
				<NodeBodyRow
					shapeId={shape.id}
					portId="dividend"
					value={node.a}
					onChange={(newValue) =>
						updateNode<DivideNode>(editor, shape, (node) => ({ ...node, a: newValue }))
					}
				/>
				<NodeBodyRow
					shapeId={shape.id}
					portId="divisor"
					value={node.b}
					onChange={(newValue) =>
						updateNode<DivideNode>(editor, shape, (node) => ({ ...node, b: newValue }))
					}
				/>
			</>
		)
	},
}
