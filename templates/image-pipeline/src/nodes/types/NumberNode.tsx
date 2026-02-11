import { T, TldrawUiSlider, useEditor } from 'tldraw'
import { NumberIcon } from '../../components/icons/NumberIcon'
import { NODE_HEADER_HEIGHT_PX, NODE_ROW_HEIGHT_PX, NODE_WIDTH_PX } from '../../constants'
import { ShapePort } from '../../ports/Port'
import { sleep } from '../../utils/sleep'
import { NodeShape } from '../NodeShapeUtil'
import {
	ExecutionResult,
	InfoValues,
	NodeComponentProps,
	NodeDefinition,
	NodeRow,
	updateNode,
} from './shared'

export type NumberNode = T.TypeOf<typeof NumberNode>
export const NumberNode = T.object({
	type: T.literal('number'),
	value: T.number,
})

export class NumberNodeDefinition extends NodeDefinition<NumberNode> {
	static type = 'number'
	static validator = NumberNode
	title = 'Number'
	heading = 'Number'
	hidden = true as const
	icon = (<NumberIcon />)
	category = 'input'
	getDefault(): NumberNode {
		return {
			type: 'number',
			value: 50,
		}
	}
	getBodyHeightPx() {
		return NODE_ROW_HEIGHT_PX
	}
	getPorts(): Record<string, ShapePort> {
		return {
			output: {
				id: 'output',
				x: NODE_WIDTH_PX,
				y: NODE_HEADER_HEIGHT_PX / 2,
				terminal: 'start',
				dataType: 'number',
			},
		}
	}
	async execute(_shape: NodeShape, node: NumberNode): Promise<ExecutionResult> {
		await sleep(200)
		return { output: node.value }
	}
	getOutputInfo(shape: NodeShape, node: NumberNode): InfoValues {
		return {
			output: {
				value: node.value,
				isOutOfDate: shape.props.isOutOfDate,
				dataType: 'number',
			},
		}
	}
	Component = NumberNodeComponent
}

function NumberNodeComponent({ shape, node }: NodeComponentProps<NumberNode>) {
	const editor = useEditor()
	return (
		<NodeRow className="NumberNode" onPointerDown={editor.markEventAsHandled}>
			<TldrawUiSlider
				steps={100}
				value={node.value}
				label="Value"
				title={node.value.toString()}
				onValueChange={(value) => {
					editor.setSelectedShapes([shape.id])
					updateNode<NumberNode>(editor, shape, (node) => ({ ...node, value }), false)
				}}
				onHistoryMark={() => {}}
			/>
		</NodeRow>
	)
}
