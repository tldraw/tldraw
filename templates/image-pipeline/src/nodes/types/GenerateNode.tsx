import { T, useEditor } from 'tldraw'
import { apiGenerate } from '../../api/pipelineApi'
import { GenerateIcon } from '../../components/icons/GenerateIcon'
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
	getInputMulti,
	InfoValues,
	InputValues,
	isMultiInfoValue,
	NodeComponentProps,
	NodeDefinition,
	NodeImagePreview,
	NodePortRow,
	NodeRow,
	NodeSliderRow,
	NodeTruncatedText,
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
	icon = <GenerateIcon />
	category = 'process'
	resultKeys = ['lastResultUrl'] as const
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
		// 4 port rows + image preview + 3 parameter rows
		return NODE_ROW_HEIGHT_PX * 7 + NODE_IMAGE_PREVIEW_HEIGHT_PX
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
			image: {
				id: 'image',
				x: 0,
				y: baseY + NODE_ROW_HEIGHT_PX * 3.5,
				terminal: 'end',
				dataType: 'image',
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
		const model = (inputs.model as string) ?? 'flux:flux-dev'
		const prompt =
			getInputMulti(inputs, 'prompt')
				.filter((v) => v != null)
				.map(String)
				.join(', ') || 'default'
		const negativePrompt = (inputs.negative as string | null) ?? undefined
		const referenceImageUrl = (inputs.image as string) ?? undefined

		const result = await apiGenerate({
			model,
			prompt,
			negativePrompt,
			steps: node.steps,
			cfgScale: node.cfgScale,
			seed: node.seed,
			referenceImageUrl,
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

	return (
		<>
			<NodePortRow
				shapeId={shape.id}
				portId="model"
				dataType="model"
				label="Model"
				renderValue={(input) => String(input.value)}
			/>
			<NodePortRow
				shapeId={shape.id}
				portId="prompt"
				dataType="text"
				label="Prompt"
				renderValue={(input) => (
					<NodeTruncatedText
						text={
							isMultiInfoValue(input)
								? input.value.filter((v): v is string => typeof v === 'string').join(', ')
								: String(input.value ?? '')
						}
					/>
				)}
			/>
			<NodePortRow
				shapeId={shape.id}
				portId="negative"
				dataType="text"
				label="Negative"
				disconnectedLabel="optional"
				renderValue={(input) => <NodeTruncatedText text={String(input.value ?? '')} />}
			/>
			<NodePortRow
				shapeId={shape.id}
				portId="image"
				dataType="image"
				label="Ref image"
				disconnectedLabel="optional"
			/>
			<NodeImagePreview
				src={node.lastResultUrl}
				alt="Generated"
				emptyText="Run pipeline to generate"
				isLoading={shape.props.isOutOfDate}
			/>
			<NodeSliderRow
				label="Steps"
				min={1}
				max={100}
				value={node.steps}
				onChange={(steps) =>
					updateNode<GenerateNode>(editor, shape, (n) => ({ ...n, steps }), false)
				}
			/>
			<NodeSliderRow
				label="CFG"
				min={1}
				max={30}
				step={0.5}
				value={node.cfgScale}
				onChange={(cfgScale) =>
					updateNode<GenerateNode>(editor, shape, (n) => ({ ...n, cfgScale }), false)
				}
			/>
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
