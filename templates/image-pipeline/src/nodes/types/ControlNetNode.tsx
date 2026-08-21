import { T, useEditor } from 'tldraw'
import { apiGenerate } from '../../api/pipelineApi'
import { ControlNetIcon } from '../../components/icons/ControlNetIcon'
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

const CONTROL_MODES = [
	{ id: 'canny', label: 'Canny edge' },
	{ id: 'depth', label: 'Depth map' },
	{ id: 'pose', label: 'Pose' },
	{ id: 'segmentation', label: 'Segmentation' },
] as const

export type ControlNetNode = T.TypeOf<typeof ControlNetNode>
export const ControlNetNode = T.object({
	type: T.literal('controlnet'),
	mode: T.string,
	strength: T.number,
	steps: T.number,
	lastResultUrl: T.string.nullable(),
})

export class ControlNetNodeDefinition extends NodeDefinition<ControlNetNode> {
	static type = 'controlnet'
	static validator = ControlNetNode
	title = 'ControlNet'
	heading = 'ControlNet'
	icon = <ControlNetIcon />
	category = 'process'
	resultKeys = ['lastResultUrl'] as const
	getDefault(): ControlNetNode {
		return {
			type: 'controlnet',
			mode: 'canny',
			strength: 75,
			steps: 20,
			lastResultUrl: null,
		}
	}
	getBodyHeightPx() {
		// model input + image input + prompt input + mode row + strength row + steps row + preview
		return NODE_ROW_HEIGHT_PX * 6 + NODE_IMAGE_PREVIEW_HEIGHT_PX
	}
	getPorts(): Record<string, ShapePort> {
		const baseY = NODE_HEADER_HEIGHT_PX + NODE_ROW_HEADER_GAP_PX
		return {
			model: {
				id: 'model',
				x: 0,
				y: baseY + NODE_ROW_HEIGHT_PX * 0.5,
				terminal: 'end',
				dataType: 'model',
			},
			image: {
				id: 'image',
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
		node: ControlNetNode,
		inputs: InputValues
	): Promise<ExecutionResult> {
		const model = (inputs.model as string) ?? 'stable-diffusion:sdxl'
		const prompt = (inputs.prompt as string) ?? ''
		const referenceImageUrl = (inputs.image as string) ?? undefined

		const result = await apiGenerate({
			model,
			prompt,
			steps: node.steps,
			cfgScale: 7,
			controlNetMode: node.mode,
			controlNetStrength: node.strength,
			referenceImageUrl,
		})

		updateNode<ControlNetNode>(this.editor, shape, (n) => ({
			...n,
			lastResultUrl: result.imageUrl,
		}))
		return { output: result.imageUrl }
	}
	getOutputInfo(shape: NodeShape, node: ControlNetNode, inputs: InfoValues): InfoValues {
		return {
			output: {
				value: node.lastResultUrl,
				isOutOfDate: areAnyInputsOutOfDate(inputs) || shape.props.isOutOfDate,
				dataType: 'image',
			},
		}
	}
	Component = ControlNetNodeComponent
}

function ControlNetNodeComponent({ shape, node }: NodeComponentProps<ControlNetNode>) {
	const editor = useEditor()

	return (
		<>
			<NodePortRow
				shapeId={shape.id}
				portId="model"
				dataType="model"
				label="Model"
				renderValue={(input) => String(input.value)}
			/>
			<NodePortRow shapeId={shape.id} portId="image" dataType="image" label="Reference" />
			<NodePortRow
				shapeId={shape.id}
				portId="prompt"
				dataType="text"
				label="Prompt"
				renderValue={(input) =>
					typeof input.value === 'string' ? <NodeTruncatedText text={input.value} /> : 'connected'
				}
			/>
			<NodeSelectRow
				label="Mode"
				value={node.mode}
				options={CONTROL_MODES}
				onChange={(mode) => updateNode<ControlNetNode>(editor, shape, (n) => ({ ...n, mode }))}
			/>
			<NodeSliderRow
				label="Strength"
				min={0}
				max={100}
				suffix="%"
				value={node.strength}
				onChange={(strength) =>
					updateNode<ControlNetNode>(editor, shape, (n) => ({ ...n, strength }), false)
				}
			/>
			<NodeSliderRow
				label="Steps"
				min={1}
				max={50}
				value={node.steps}
				onChange={(steps) =>
					updateNode<ControlNetNode>(editor, shape, (n) => ({ ...n, steps }), false)
				}
			/>
			<NodeImagePreview
				src={node.lastResultUrl}
				alt="ControlNet result"
				emptyText="Connect model + reference image"
				isLoading={shape.props.isOutOfDate}
			/>
		</>
	)
}
