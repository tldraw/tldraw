import classNames from 'classnames'
import { T, useEditor, useValue } from 'tldraw'
import { apiGenerate } from '../../api/pipelineApi'
import { ControlNetIcon } from '../../components/icons/ControlNetIcon'
import {
	NODE_HEADER_HEIGHT_PX,
	NODE_IMAGE_PREVIEW_HEIGHT_PX,
	NODE_ROW_HEADER_GAP_PX,
	NODE_ROW_HEIGHT_PX,
	NODE_WIDTH_PX,
} from '../../constants'
import { Port, ShapePort } from '../../ports/Port'
import { getNodeInputPortValues } from '../nodePorts'
import { NodeShape } from '../NodeShapeUtil'
import {
	areAnyInputsOutOfDate,
	ExecutionResult,
	InfoValues,
	InputValues,
	NodeComponentProps,
	NodeDefinition,
	NodeImage,
	NodePlaceholder,
	NodePortLabel,
	NodeRow,
	STOP_EXECUTION,
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
	icon = (<ControlNetIcon />)
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

	const modelInput = useValue('model input', () => getNodeInputPortValues(editor, shape.id).model, [
		editor,
		shape.id,
	])
	const imageInput = useValue('image input', () => getNodeInputPortValues(editor, shape.id).image, [
		editor,
		shape.id,
	])
	const promptInput = useValue(
		'prompt input',
		() => getNodeInputPortValues(editor, shape.id).prompt,
		[editor, shape.id]
	)

	return (
		<>
			<NodeRow>
				<Port shapeId={shape.id} portId="model" />
				<NodePortLabel dataType="model">Model</NodePortLabel>
				{modelInput ? (
					<span className="NodeRow-connected-value">
						{modelInput.isOutOfDate || modelInput.value === STOP_EXECUTION ? (
							<NodePlaceholder />
						) : (
							String(modelInput.value)
						)}
					</span>
				) : (
					<span className="NodeRow-disconnected">not connected</span>
				)}
			</NodeRow>
			<NodeRow>
				<Port shapeId={shape.id} portId="image" />
				<NodePortLabel dataType="image">Reference</NodePortLabel>
				{imageInput ? (
					<span className="NodeRow-connected-value">
						{imageInput.isOutOfDate || imageInput.value === STOP_EXECUTION ? (
							<NodePlaceholder />
						) : (
							'connected'
						)}
					</span>
				) : (
					<span className="NodeRow-disconnected">not connected</span>
				)}
			</NodeRow>
			<NodeRow>
				<Port shapeId={shape.id} portId="prompt" />
				<NodePortLabel dataType="text">Prompt</NodePortLabel>
				{promptInput ? (
					<span className="NodeRow-connected-value">
						{promptInput.isOutOfDate || promptInput.value === STOP_EXECUTION ? (
							<NodePlaceholder />
						) : typeof promptInput.value === 'string' ? (
							promptInput.value.slice(0, 15) + (promptInput.value.length > 15 ? '...' : '')
						) : (
							'connected'
						)}
					</span>
				) : (
					<span className="NodeRow-disconnected">not connected</span>
				)}
			</NodeRow>
			<NodeRow>
				<span className="NodeInputRow-label">Mode</span>
				<select
					value={node.mode}
					onChange={(e) =>
						updateNode<ControlNetNode>(editor, shape, (n) => ({
							...n,
							mode: e.target.value,
						}))
					}
				>
					{CONTROL_MODES.map((m) => (
						<option key={m.id} value={m.id}>
							{m.label}
						</option>
					))}
				</select>
			</NodeRow>
			<NodeRow className="NodeInputRow">
				<span className="NodeInputRow-label">Strength</span>
				<input
					type="range"
					min="0"
					max="100"
					value={node.strength}
					onChange={(e) =>
						updateNode<ControlNetNode>(
							editor,
							shape,
							(n) => ({ ...n, strength: Number(e.target.value) }),
							false
						)
					}
					onPointerDown={(e) => e.stopPropagation()}
				/>
				<span className="NodeRow-value">{node.strength}%</span>
			</NodeRow>
			<NodeRow className="NodeInputRow">
				<span className="NodeInputRow-label">Steps</span>
				<input
					type="range"
					min="1"
					max="50"
					value={node.steps}
					onChange={(e) =>
						updateNode<ControlNetNode>(
							editor,
							shape,
							(n) => ({ ...n, steps: Number(e.target.value) }),
							false
						)
					}
					onPointerDown={(e) => e.stopPropagation()}
				/>
				<span className="NodeRow-value">{node.steps}</span>
			</NodeRow>
			<div
				className={classNames('NodeImagePreview', {
					NodeImagePreview_loading: shape.props.isOutOfDate,
				})}
			>
				{node.lastResultUrl ? (
					<NodeImage src={node.lastResultUrl} alt="ControlNet result" />
				) : (
					<div className="NodeImagePreview-empty">
						<span>Connect model + reference image</span>
					</div>
				)}
			</div>
		</>
	)
}
