import { T, useEditor } from 'tldraw'
import { ConditionalIcon } from '../../components/icons/ConditionalIcon'
import {
	NODE_HEADER_HEIGHT_PX,
	NODE_ROW_BOTTOM_PADDING_PX,
	NODE_ROW_HEADER_GAP_PX,
	NODE_ROW_HEIGHT_PX,
	NODE_WIDTH_PX,
} from '../../constants'
import { Port } from '../../ports/Port'
import { NodeDefinition, NodeInputRow, NodeRow, STOP_EXECUTION, updateNode } from './shared'

/**
 * The operators that can be used in the conditional node.
 */
export const operators = {
	'==': {
		title: 'is equal to',
		evaluate: (lhs, rhs) => lhs === rhs,
	},
	'!=': {
		title: 'is not equal to',
		evaluate: (lhs, rhs) => lhs !== rhs,
	},
	'>': {
		title: 'is greater than',
		evaluate: (lhs, rhs) => lhs > rhs,
	},
	'<': {
		title: 'is less than',
		evaluate: (lhs, rhs) => lhs < rhs,
	},
	'>=': {
		title: 'is greater than or equal to',
		evaluate: (lhs, rhs) => lhs >= rhs,
	},
	'<=': {
		title: 'is less than or equal to',
		evaluate: (lhs, rhs) => lhs <= rhs,
	},
} satisfies Record<
	string,
	{
		title: string
		evaluate: (lhs: number, rhs: number) => boolean
	}
>

type Operator = keyof typeof operators
const Operator = T.literalEnum(...(Object.keys(operators) as Operator[]))

/**
 * The conditional node has a condition (two inputs and an operator), and two outputs. If the
 * condition evaluates to true, the first output port gets a value and the other stops execution. If
 * the condition evaluates to false, it's the other way around.
 */
export type ConditionalNode = T.TypeOf<typeof ConditionalNodeType>
export const ConditionalNodeType = T.object({
	type: T.literal('conditional'),
	lhs: T.number,
	rhs: T.number,
	operator: Operator,
})

export const ConditionalNode: NodeDefinition<ConditionalNode> = {
	type: 'conditional',
	validator: ConditionalNodeType,
	title: 'Conditional',
	heading: 'If',
	icon: <ConditionalIcon />,
	getDefault: () => ({
		type: 'conditional',
		lhs: 0,
		rhs: 0,
		operator: '==',
	}),
	// There are 5 rows in the conditional, but we have less padding at the bottom than usual.
	getBodyHeightPx: () => NODE_ROW_HEIGHT_PX * 5 - NODE_ROW_BOTTOM_PADDING_PX,
	// We need a port for each input and output.
	getPorts: () => ({
		lhs: {
			id: 'lhs',
			x: 0,
			y: NODE_HEADER_HEIGHT_PX + NODE_ROW_HEADER_GAP_PX + NODE_ROW_HEIGHT_PX * 0.5,
			terminal: 'end',
		},
		rhs: {
			id: 'rhs',
			x: 0,
			y: NODE_HEADER_HEIGHT_PX + NODE_ROW_HEADER_GAP_PX + NODE_ROW_HEIGHT_PX * 2.5,
			terminal: 'end',
		},
		outputTrue: {
			id: 'outputTrue',
			x: NODE_WIDTH_PX,
			y: NODE_HEADER_HEIGHT_PX + NODE_ROW_HEADER_GAP_PX + NODE_ROW_HEIGHT_PX * 3.5,
			terminal: 'start',
		},
		outputFalse: {
			id: 'outputFalse',
			x: NODE_WIDTH_PX,
			y: NODE_HEADER_HEIGHT_PX + NODE_ROW_HEADER_GAP_PX + NODE_ROW_HEIGHT_PX * 4.5,
			terminal: 'start',
		},
	}),
	// The output of the conditional node is the value of the first output port, or STOP_EXECUTION
	// if the condition is false.
	computeOutput: (node, inputs) => {
		const lhs = inputs.lhs ?? node.lhs
		const rhs = inputs.rhs ?? node.rhs

		if (operators[node.operator].evaluate(lhs, rhs)) {
			return { outputTrue: lhs, outputFalse: STOP_EXECUTION }
		} else {
			return { outputTrue: STOP_EXECUTION, outputFalse: lhs }
		}
	},
	Component: ({ shape, node }) => {
		const editor = useEditor()
		return (
			<>
				<NodeInputRow
					shapeId={shape.id}
					portId="lhs"
					value={node.lhs}
					onChange={(newValue) =>
						updateNode<ConditionalNode>(editor, shape, (node) => ({ ...node, lhs: newValue }))
					}
				/>
				<NodeRow>
					<select
						value={node.operator}
						onChange={(e) =>
							updateNode<ConditionalNode>(editor, shape, (node) => ({
								...node,
								operator: e.target.value as Operator,
							}))
						}
					>
						{Object.entries(operators).map(([operator, { title }]) => (
							<option key={operator} value={operator}>
								{title}
							</option>
						))}
					</select>
				</NodeRow>
				<NodeInputRow
					shapeId={shape.id}
					portId="rhs"
					value={node.rhs}
					onChange={(newValue) =>
						updateNode<ConditionalNode>(editor, shape, (node) => ({ ...node, rhs: newValue }))
					}
				/>
				<NodeRow className="ConditionalNode-output">
					Then
					<Port shapeId={shape.id} portId="outputTrue" />
				</NodeRow>
				<NodeRow className="ConditionalNode-output ConditionalNode-output-false">
					Otherwise
					<Port shapeId={shape.id} portId="outputFalse" />
				</NodeRow>
			</>
		)
	},
}
