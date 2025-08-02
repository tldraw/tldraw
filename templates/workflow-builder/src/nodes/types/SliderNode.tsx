import { stopEventPropagation, T, TldrawUiSlider, useEditor } from 'tldraw'
import { SliderIcon } from '../../components/icons/SliderIcon'
import { NODE_ROW_HEIGHT_PX } from '../../constants'
import { NodeDefinition, NodeRow, outputPort, updateNode } from './shared'

/**
 * The slider node has a single output port and no inputs.
 */
export type SliderNode = T.TypeOf<typeof SliderNodeType>
export const SliderNodeType = T.object({
	type: T.literal('slider'),
	value: T.number,
})

export const SliderNode: NodeDefinition<SliderNode> = {
	type: 'slider',
	validator: SliderNodeType,
	title: 'Slider',
	icon: <SliderIcon />,
	getDefault: () => ({
		type: 'slider',
		value: 50,
	}),
	getBodyHeightPx: () => NODE_ROW_HEIGHT_PX,
	getPorts: () => ({
		output: outputPort,
	}),
	computeOutput: (node) => ({
		output: node.value,
	}),
	Component: ({ shape, node }) => {
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
	},
}
