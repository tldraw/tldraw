import { T, useEditor, useValue } from 'tldraw'
import { apiGenerate } from '../../api/pipelineApi'
import { GenerateIcon } from '../../components/icons/GenerateIcon'
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
	isMultiInfoValue,
	NodeComponentProps,
	NodeDefinition,
	NodePlaceholder,
	NodePortLabel,
	NodeRow,
	STOP_EXECUTION,
	updateNode,
} from './shared'

export type GenerateNode = T.TypeOf<typeof GenerateNode>
export const GenerateNode = T.object({
	type: T.literal('generate'),
	steps: T.number,
	cfgScale: T.number,
	seed: T.number,
	lastResultUrl: T.string.nullable(),
})

export class GenerateNodeDefinition extends NodeDefinition<GenerateNode> {
	static type = 'generate'
	static validator = GenerateNode
	title = 'Generate'
	heading = 'Generate'
	icon = (<GenerateIcon />)
	category = 'process'
	getDefault(): GenerateNode {
		return {
			type: 'generate',
			steps: 20,
			cfgScale: 7,
			seed: Math.floor(Math.random() * 99999),
			lastResultUrl: null,
		}
	}
	getBodyHeightPx() {
		// 3 port rows + image preview + 3 parameter rows
		return NODE_ROW_HEIGHT_PX * 6 + NODE_IMAGE_PREVIEW_HEIGHT_PX
	}
	getPorts(_shape: NodeShape, _node: GenerateNode): Record<string, ShapePort> {
		const baseY = NODE_HEADER_HEIGHT_PX + NODE_ROW_HEADER_GAP_PX
		return {
			model: {
				id: 'model',
				x: 0,
				y: baseY + NODE_ROW_HEIGHT_PX * 0.5,
				terminal: 'end',
				dataType: 'model',
			},
			prompt: {
				id: 'prompt',
				x: 0,
				y: baseY + NODE_ROW_HEIGHT_PX * 1.5,
				terminal: 'end',
				dataType: 'text',
				multi: true,
			},
			negative: {
				id: 'negative',
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
		node: GenerateNode,
		inputs: InputValues
	): Promise<ExecutionResult> {
		const model = (inputs.model as string) ?? 'stable-diffusion:sdxl'
		const rawPrompt = inputs.prompt
		const prompt = Array.isArray(rawPrompt)
			? rawPrompt.filter((v): v is string => typeof v === 'string').join(', ')
			: ((rawPrompt as string) ?? 'default')
		const negativePrompt = inputs.negative as string | undefined

		const result = await apiGenerate({
			model,
			prompt,
			negativePrompt: negativePrompt ?? undefined,
			steps: node.steps,
			cfgScale: node.cfgScale,
			seed: node.seed,
		})

		updateNode<GenerateNode>(this.editor, shape, (n) => ({
			...n,
			lastResultUrl: result.imageUrl,
		}))

		return { output: result.imageUrl }
	}
	getOutputInfo(shape: NodeShape, node: GenerateNode, inputs: InfoValues): InfoValues {
		return {
			output: {
				value: node.lastResultUrl,
				isOutOfDate: areAnyInputsOutOfDate(inputs) || shape.props.isOutOfDate,
				dataType: 'image',
			},
		}
	}
	Component = GenerateNodeComponent
}

function GenerateNodeComponent({ shape, node }: NodeComponentProps<GenerateNode>) {
	const editor = useEditor()

	const modelInput = useValue('model input', () => getNodeInputPortValues(editor, shape.id).model, [
		editor,
		shape.id,
	])
	const promptInput = useValue(
		'prompt input',
		() => getNodeInputPortValues(editor, shape.id).prompt,
		[editor, shape.id]
	)
	const negativeInput = useValue(
		'negative input',
		() => getNodeInputPortValues(editor, shape.id).negative,
		[editor, shape.id]
	)

	return (
		<>
			<NodeRow>
				<Port shapeId={shape.id} portId="model" />
				<NodePortLabel dataType="model">Model</NodePortLabel>
				{modelInput ? (
					<span className="NodeRow-connected-value">
						{modelInput.isOutOfDate ? <NodePlaceholder /> : String(modelInput.value)}
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
						{promptInput.isOutOfDate ? (
							<NodePlaceholder />
						) : (
							(() => {
								const display = isMultiInfoValue(promptInput)
									? promptInput.value.filter((v): v is string => typeof v === 'string').join(', ')
									: String(promptInput.value ?? '')
								return (
									<span title={display}>
										{display.slice(0, 20)}
										{display.length > 20 ? '...' : ''}
									</span>
								)
							})()
						)}
					</span>
				) : (
					<span className="NodeRow-disconnected">not connected</span>
				)}
			</NodeRow>
			<NodeRow>
				<Port shapeId={shape.id} portId="negative" />
				<NodePortLabel dataType="text">Negative</NodePortLabel>
				{negativeInput ? (
					<span className="NodeRow-connected-value">
						{negativeInput.isOutOfDate || negativeInput.value === STOP_EXECUTION ? (
							<NodePlaceholder />
						) : (
							<span title={String(negativeInput.value)}>
								{String(negativeInput.value ?? '').slice(0, 20)}
							</span>
						)}
					</span>
				) : (
					<span className="NodeRow-disconnected">optional</span>
				)}
			</NodeRow>
			<div className="NodeImagePreview">
				{node.lastResultUrl ? (
					<img src={node.lastResultUrl} alt="Generated" />
				) : (
					<div className="NodeImagePreview-empty">
						<span>Run pipeline to generate</span>
					</div>
				)}
			</div>
			<NodeRow className="NodeInputRow">
				<span className="NodeInputRow-label">Steps</span>
				<input
					type="range"
					min="1"
					max="100"
					value={node.steps}
					onChange={(e) =>
						updateNode<GenerateNode>(
							editor,
							shape,
							(n) => ({
								...n,
								steps: Number(e.target.value),
							}),
							false
						)
					}
					onPointerDown={(e) => e.stopPropagation()}
				/>
				<span className="NodeRow-value">{node.steps}</span>
			</NodeRow>
			<NodeRow className="NodeInputRow">
				<span className="NodeInputRow-label">CFG</span>
				<input
					type="range"
					min="1"
					max="30"
					step="0.5"
					value={node.cfgScale}
					onChange={(e) =>
						updateNode<GenerateNode>(
							editor,
							shape,
							(n) => ({
								...n,
								cfgScale: Number(e.target.value),
							}),
							false
						)
					}
					onPointerDown={(e) => e.stopPropagation()}
				/>
				<span className="NodeRow-value">{node.cfgScale}</span>
			</NodeRow>
			<NodeRow className="NodeInputRow">
				<span className="NodeInputRow-label">Seed</span>
				<input
					type="text"
					inputMode="numeric"
					value={node.seed}
					onChange={(e) => {
						const v = parseInt(e.target.value, 10)
						if (!isNaN(v)) {
							updateNode<GenerateNode>(editor, shape, (n) => ({
								...n,
								seed: Math.max(0, v),
							}))
						}
					}}
					onPointerDown={(e) => e.stopPropagation()}
					onFocus={() => editor.setSelectedShapes([shape.id])}
				/>
			</NodeRow>
		</>
	)
}
