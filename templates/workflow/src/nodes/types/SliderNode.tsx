import { stopEventPropagation, T, TldrawUiSlider, useEditor } from 'tldraw'
import { SliderIcon } from '../../components/icons/SliderIcon'
import { NODE_HEADER_HEIGHT_PX, NODE_ROW_HEIGHT_PX, NODE_WIDTH_PX } from '../../constants'
import { ShapePort } from '../../ports/Port'
import { NodeShape } from '../NodeShapeUtil'
import {
	ExecutionResult,
	InfoValues,
	InputValues,
	NodeComponentProps,
	NodeDefinition,
	NodeRow,
	updateNode,
} from './shared'

/**
 * The slider node has a single output port and no inputs.
 */
export type SliderNode = T.TypeOf<typeof SliderNode>
export const SliderNode = T.object({
	type: T.literal('slider'),
	value: T.number,
})

export class SliderNodeType extends NodeDefinition<SliderNode> {
	static type = 'slider'
	static validator = SliderNode
	title = 'Slider'
	heading = 'Slider'
	icon = (<SliderIcon />)
	getDefault(): SliderNode {
		return {
			type: 'slider',
			value: 50,
		}
	}
	getBodyHeightPx(_shape: NodeShape, _node: SliderNode) {
		return NODE_ROW_HEIGHT_PX
	}
	getPorts(_shape: NodeShape, _node: SliderNode): Record<string, ShapePort> {
		return {
			output: {
				id: 'output',
				x: NODE_WIDTH_PX,
				y: NODE_HEADER_HEIGHT_PX / 2,
				terminal: 'start',
			},
		}
	}
	async execute(shape: NodeShape, node: SliderNode, inputs: InputValues): Promise<ExecutionResult> {
		return {
			output: node.value,
		}
	}
	getOutputInfo(_shape: NodeShape, _node: SliderNode, _inputs: InfoValues): InfoValues {
		return {}
	}
	Component = SliderNodeComponent
}

export function SliderNodeComponent({ shape, node }: NodeComponentProps<SliderNode>) {
	const editor = useEditor()
	return (
		<NodeRow className="SliderNode" onPointerDown={stopEventPropagation}>
			<TldrawUiSlider
				steps={100}
				value={node.value}
				label="Slider"
				title="Slider"
				onValueChange={(value) => {
					editor.setSelectedShapes([shape.id])
					updateNode<SliderNode>(editor, shape, (node) => ({ ...node, value }))
				}}
				onHistoryMark={() => {}}
			/>
		</NodeRow>
	)
}
