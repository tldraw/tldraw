import { T, useEditor } from 'tldraw'
import { PromptIcon } from '../../components/icons/PromptIcon'
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

export type PromptNode = T.TypeOf<typeof PromptNode>
export const PromptNode = T.object({
	type: T.literal('prompt'),
	text: T.string,
})

export class PromptNodeDefinition extends NodeDefinition<PromptNode> {
	static type = 'prompt'
	static validator = PromptNode
	title = 'Prompt'
	heading = 'Prompt'
	icon = (<PromptIcon />)
	category = 'input'
	getDefault(): PromptNode {
		return {
			type: 'prompt',
			text: 'a photo of a cat sitting on a windowsill',
		}
	}
	getBodyHeightPx() {
		return NODE_ROW_HEIGHT_PX * 2
	}
	getPorts(): Record<string, ShapePort> {
		return {
			output: {
				id: 'output',
				x: NODE_WIDTH_PX,
				y: NODE_HEADER_HEIGHT_PX / 2,
				terminal: 'start',
				dataType: 'text',
			},
		}
	}
	async execute(_shape: NodeShape, node: PromptNode): Promise<ExecutionResult> {
		await sleep(200)
		return { output: node.text }
	}
	getOutputInfo(shape: NodeShape, node: PromptNode): InfoValues {
		return {
			output: {
				value: node.text,
				isOutOfDate: shape.props.isOutOfDate,
				dataType: 'text',
			},
		}
	}
	Component = PromptNodeComponent
}

function PromptNodeComponent({ shape, node }: NodeComponentProps<PromptNode>) {
	const editor = useEditor()
	return (
		<NodeRow className="PromptNode-row">
			<textarea
				className="PromptNode-textarea"
				value={node.text}
				placeholder="Enter your prompt..."
				onChange={(e) =>
					updateNode<PromptNode>(
						editor,
						shape,
						(n) => ({
							...n,
							text: e.target.value,
						}),
						false
					)
				}
				onPointerDown={(e) => e.stopPropagation()}
				onFocus={() => editor.setSelectedShapes([shape.id])}
			/>
		</NodeRow>
	)
}
