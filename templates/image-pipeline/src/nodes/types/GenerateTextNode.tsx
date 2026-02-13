import classNames from 'classnames'
import { T, useEditor, useValue } from 'tldraw'
import { apiGenerateText } from '../../api/pipelineApi'
import { GenerateTextIcon } from '../../components/icons/GenerateTextIcon'
import {
	NODE_HEADER_HEIGHT_PX,
	NODE_ROW_HEADER_GAP_PX,
	NODE_ROW_HEIGHT_PX,
	NODE_WIDTH_PX,
} from '../../constants'
import { Port, ShapePort } from '../../ports/Port'
import { getNodeInputPortValues } from '../nodePorts'
import { NodeShape } from '../NodeShapeUtil'
import {
	areAnyInputsOutOfDate,
	coerceToText,
	ExecutionResult,
	getInput,
	getInputText,
	InfoValues,
	InputValues,
	NodeComponentProps,
	NodeDefinition,
	NodePlaceholder,
	NodePortLabel,
	NodeRow,
	updateNode,
} from './shared'

export type GenerateTextNode = T.TypeOf<typeof GenerateTextNode>
export const GenerateTextNode = T.object({
	type: T.literal('generate_text'),
	lastResultText: T.string.nullable(),
})

const DEFAULT_PROMPT = 'Describe this image in detail.'

export class GenerateTextNodeDefinition extends NodeDefinition<GenerateTextNode> {
	static type = 'generate_text'
	static validator = GenerateTextNode
	title = 'Generate text'
	heading = 'Generate text'
	icon = (<GenerateTextIcon />)
	category = 'process'
	resultKeys = ['lastResultText'] as const
	getDefault(): GenerateTextNode {
		return {
			type: 'generate_text',
			lastResultText: null,
		}
	}
	getBodyHeightPx() {
		// input row (44) + prompt row (44) + result area (88 + 8 margin)
		return NODE_ROW_HEIGHT_PX * 2 + 96
	}
	getPorts(_shape: NodeShape, _node: GenerateTextNode): Record<string, ShapePort> {
		const baseY = NODE_HEADER_HEIGHT_PX + NODE_ROW_HEADER_GAP_PX
		return {
			input: {
				id: 'input',
				x: 0,
				y: baseY + NODE_ROW_HEIGHT_PX * 0.5,
				terminal: 'end',
				dataType: 'any',
			},
			prompt: {
				id: 'prompt',
				x: 0,
				y: baseY + NODE_ROW_HEIGHT_PX * 1.5,
				terminal: 'end',
				dataType: 'text',
			},
			output: {
				id: 'output',
				x: NODE_WIDTH_PX,
				y: NODE_HEADER_HEIGHT_PX / 2,
				terminal: 'start',
				dataType: 'text',
			},
		}
	}
	async execute(
		shape: NodeShape,
		_node: GenerateTextNode,
		inputs: InputValues
	): Promise<ExecutionResult> {
		const input = coerceToText(getInput(inputs, 'input')) || undefined
		const prompt = getInputText(inputs, 'prompt', DEFAULT_PROMPT)

		const result = await apiGenerateText({
			input,
			prompt,
		})

		updateNode<GenerateTextNode>(this.editor, shape, (n) => ({
			...n,
			lastResultText: result.text,
		}))

		return { output: result.text }
	}
	getOutputInfo(shape: NodeShape, node: GenerateTextNode, inputs: InfoValues): InfoValues {
		return {
			output: {
				value: node.lastResultText,
				isOutOfDate: areAnyInputsOutOfDate(inputs) || shape.props.isOutOfDate,
				dataType: 'text',
			},
		}
	}
	Component = GenerateTextNodeComponent
}

function GenerateTextNodeComponent({ shape, node }: NodeComponentProps<GenerateTextNode>) {
	const editor = useEditor()

	const inputPort = useValue('input port', () => getNodeInputPortValues(editor, shape.id).input, [
		editor,
		shape.id,
	])
	const promptPort = useValue(
		'prompt port',
		() => getNodeInputPortValues(editor, shape.id).prompt,
		[editor, shape.id]
	)

	return (
		<>
			<NodeRow>
				<Port shapeId={shape.id} portId="input" />
				<NodePortLabel dataType="any">Input</NodePortLabel>
				{inputPort ? (
					<span className="NodeRow-connected-value">
						{inputPort.isOutOfDate ? (
							<NodePlaceholder />
						) : (
							<span title={String(inputPort.value)}>
								{String(inputPort.value ?? '').slice(0, 20)}
								{String(inputPort.value ?? '').length > 20 ? '...' : ''}
							</span>
						)}
					</span>
				) : (
					<span className="NodeRow-disconnected">not connected</span>
				)}
			</NodeRow>
			<NodeRow>
				<Port shapeId={shape.id} portId="prompt" />
				<NodePortLabel dataType="text">Prompt</NodePortLabel>
				{promptPort ? (
					<span className="NodeRow-connected-value">
						{promptPort.isOutOfDate ? (
							<NodePlaceholder />
						) : (
							<span title={String(promptPort.value)}>
								{String(promptPort.value ?? '').slice(0, 20)}
								{String(promptPort.value ?? '').length > 20 ? '...' : ''}
							</span>
						)}
					</span>
				) : (
					<span className="NodeRow-disconnected">optional</span>
				)}
			</NodeRow>
			<div
				className={classNames('GenerateTextNode-result', {
					'GenerateTextNode-result_loading': shape.props.isOutOfDate,
				})}
				onPointerDown={(e) => e.stopPropagation()}
				onWheel={(e) => e.stopPropagation()}
			>
				{node.lastResultText ? (
					<div className="GenerateTextNode-result-text">{node.lastResultText}</div>
				) : (
					<div className="GenerateTextNode-result-empty">
						<span>Run to generate text</span>
					</div>
				)}
			</div>
		</>
	)
}
