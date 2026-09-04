import { T, useEditor } from 'tldraw'
import { apiStyleTransfer } from '../../api/pipelineApi'
import { StyleTransferIcon } from '../../components/icons/StyleTransferIcon'
import {
	NODE_HEADER_HEIGHT_PX,
	NODE_IMAGE_PREVIEW_HEIGHT_PX,
	NODE_ROW_HEADER_GAP_PX,
	NODE_ROW_HEIGHT_PX,
	NODE_WIDTH_PX,
} from '../../constants'
import { ShapePort } from '../../ports/Port'
import { NodeShape } from '../NodeShapeUtil'
import {
	areAnyInputsOutOfDate,
	ExecutionResult,
	InfoValues,
	InputValues,
	NodeComponentProps,
	NodeDefinition,
	NodeImagePreview,
	NodePortRow,
	NodeSelectRow,
	NodeSliderRow,
	NodeTruncatedText,
	updateNode,
} from './shared'

const STYLE_MODELS = [
	{ id: 'fast', label: 'Fast' },
	{ id: 'high-quality', label: 'High quality' },
	{ id: 'realistic', label: 'Realistic' },
	{ id: 'cinematic', label: 'Cinematic' },
	{ id: 'animated', label: 'Animated' },
] as const

export type StyleTransferNode = T.TypeOf<typeof StyleTransferNode>
export const StyleTransferNode = T.object({
	type: T.literal('style_transfer'),
	model: T.string,
	strength: T.number,
	lastResultUrl: T.string.nullable(),
})

export class StyleTransferNodeDefinition extends NodeDefinition<StyleTransferNode> {
	static type = 'style_transfer'
	static validator = StyleTransferNode
	title = 'Style transfer'
	heading = 'Style transfer'
	icon = <StyleTransferIcon />
	category = 'process'
	resultKeys = ['lastResultUrl'] as const
	getDefault(): StyleTransferNode {
		return {
			type: 'style_transfer',
			model: 'fast',
			strength: 50,
			lastResultUrl: null,
		}
	}
	getBodyHeightPx() {
		// style input + content input + prompt input + model row + strength row + preview
		return NODE_ROW_HEIGHT_PX * 5 + NODE_IMAGE_PREVIEW_HEIGHT_PX
	}
	getPorts(): Record<string, ShapePort> {
		const baseY = NODE_HEADER_HEIGHT_PX + NODE_ROW_HEADER_GAP_PX
		return {
			style: {
				id: 'style',
				x: 0,
				y: baseY + NODE_ROW_HEIGHT_PX * 0.5,
				terminal: 'end',
				dataType: 'image',
			},
			content: {
				id: 'content',
				x: 0,
				y: baseY + NODE_ROW_HEIGHT_PX * 1.5,
				terminal: 'end',
				dataType: 'image',
			},
			prompt: {
				id: 'prompt',
				x: 0,
				y: baseY + NODE_ROW_HEIGHT_PX * 2.5,
				terminal: 'end',
				dataType: 'text',
			},
			output: {
				id: 'output',
				x: NODE_WIDTH_PX,
				y: NODE_HEADER_HEIGHT_PX / 2,
				terminal: 'start',
				dataType: 'image',
			},
		}
	}
	async execute(
		shape: NodeShape,
		node: StyleTransferNode,
		inputs: InputValues
	): Promise<ExecutionResult> {
		const styleUrl = (inputs.style as string) ?? ''
		const contentUrl = (inputs.content as string) ?? undefined
		const prompt = (inputs.prompt as string) ?? undefined

		const result = await apiStyleTransfer({
			styleImageUrl: styleUrl,
			contentImageUrl: contentUrl,
			prompt,
			model: node.model,
			strength: node.strength / 100,
		})

		updateNode<StyleTransferNode>(this.editor, shape, (n) => ({
			...n,
			lastResultUrl: result.imageUrl,
		}))
		return { output: result.imageUrl }
	}
	getOutputInfo(shape: NodeShape, node: StyleTransferNode, inputs: InfoValues): InfoValues {
		return {
			output: {
				value: node.lastResultUrl,
				isOutOfDate: areAnyInputsOutOfDate(inputs) || shape.props.isOutOfDate,
				dataType: 'image',
			},
		}
	}
	Component = StyleTransferNodeComponent
}

function StyleTransferNodeComponent({ shape, node }: NodeComponentProps<StyleTransferNode>) {
	const editor = useEditor()

	return (
		<>
			<NodePortRow shapeId={shape.id} portId="style" dataType="image" label="Style" />
			<NodePortRow
				shapeId={shape.id}
				portId="content"
				dataType="image"
				label="Content"
				disconnectedLabel="optional"
			/>
			<NodePortRow
				shapeId={shape.id}
				portId="prompt"
				dataType="text"
				label="Prompt"
				disconnectedLabel="optional"
				renderValue={(input) =>
					typeof input.value === 'string' ? <NodeTruncatedText text={input.value} /> : 'connected'
				}
			/>
			<NodeSelectRow
				label="Model"
				value={node.model}
				options={STYLE_MODELS}
				onChange={(model) => updateNode<StyleTransferNode>(editor, shape, (n) => ({ ...n, model }))}
			/>
			<NodeSliderRow
				label="Strength"
				min={0}
				max={100}
				suffix="%"
				value={node.strength}
				onChange={(strength) =>
					updateNode<StyleTransferNode>(editor, shape, (n) => ({ ...n, strength }), false)
				}
			/>
			<NodeImagePreview
				src={node.lastResultUrl}
				alt="Style transfer result"
				emptyText="Connect a style image"
				isLoading={shape.props.isOutOfDate}
			/>
		</>
	)
}
