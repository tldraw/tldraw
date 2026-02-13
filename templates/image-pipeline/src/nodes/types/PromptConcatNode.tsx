import { T, useEditor, useValue } from 'tldraw'
import { PromptConcatIcon } from '../../components/icons/PromptConcatIcon'
import {
	NODE_HEADER_HEIGHT_PX,
	NODE_ROW_HEADER_GAP_PX,
	NODE_ROW_HEIGHT_PX,
	NODE_WIDTH_PX,
} from '../../constants'
import { Port, ShapePort } from '../../ports/Port'
import { sleep } from '../../utils/sleep'
import { getNodeInputPortValues } from '../nodePorts'
import { NodeShape } from '../NodeShapeUtil'
import {
	areAnyInputsOutOfDate,
	ExecutionResult,
	InfoValues,
	InputValues,
	NodeComponentProps,
	NodeDefinition,
	NodePortLabel,
	NodeRow,
	updateNode,
} from './shared'

const SEPARATORS = [
	{ id: 'space', label: 'Space', value: ' ' },
	{ id: 'newline', label: 'Newline', value: '\n' },
	{ id: 'comma', label: 'Comma', value: ', ' },
	{ id: 'none', label: 'None', value: '' },
] as const

export type PromptConcatNode = T.TypeOf<typeof PromptConcatNode>
export const PromptConcatNode = T.object({
	type: T.literal('prompt_concat'),
	separator: T.string,
})

export class PromptConcatNodeDefinition extends NodeDefinition<PromptConcatNode> {
	static type = 'prompt_concat'
	static validator = PromptConcatNode
	title = 'Concat'
	heading = 'Prompt concat'
	icon = (<PromptConcatIcon />)
	category = 'process'
	getDefault(): PromptConcatNode {
		return {
			type: 'prompt_concat',
			separator: 'space',
		}
	}
	getBodyHeightPx() {
		// 3 input rows + separator row + preview row
		return NODE_ROW_HEIGHT_PX * 5
	}
	getPorts(): Record<string, ShapePort> {
		const baseY = NODE_HEADER_HEIGHT_PX + NODE_ROW_HEADER_GAP_PX
		return {
			prefix: {
				id: 'prefix',
				x: 0,
				y: baseY + NODE_ROW_HEIGHT_PX * 0.5,
				terminal: 'end',
				dataType: 'text',
			},
			main: {
				id: 'main',
				x: 0,
				y: baseY + NODE_ROW_HEIGHT_PX * 1.5,
				terminal: 'end',
				dataType: 'text',
			},
			suffix: {
				id: 'suffix',
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
				dataType: 'text',
			},
		}
	}
	async execute(
		_shape: NodeShape,
		node: PromptConcatNode,
		inputs: InputValues
	): Promise<ExecutionResult> {
		await sleep(100)
		const sep = SEPARATORS.find((s) => s.id === node.separator)?.value ?? ' '
		const parts = [inputs.prefix, inputs.main, inputs.suffix].filter(
			(v): v is string => typeof v === 'string' && v.length > 0
		)
		return { output: parts.join(sep) }
	}
	getOutputInfo(shape: NodeShape, node: PromptConcatNode, inputs: InfoValues): InfoValues {
		const sep = SEPARATORS.find((s) => s.id === node.separator)?.value ?? ' '
		const parts: string[] = []
		for (const key of ['prefix', 'main', 'suffix'] as const) {
			const info = inputs[key]
			if (info && typeof info.value === 'string' && info.value.length > 0) {
				parts.push(info.value)
			}
		}
		return {
			output: {
				value: parts.length > 0 ? parts.join(sep) : null,
				isOutOfDate: areAnyInputsOutOfDate(inputs) || shape.props.isOutOfDate,
				dataType: 'text',
			},
		}
	}
	Component = PromptConcatNodeComponent
}

function PromptConcatNodeComponent({ shape, node }: NodeComponentProps<PromptConcatNode>) {
	const editor = useEditor()

	const prefixInput = useValue('prefix', () => getNodeInputPortValues(editor, shape.id).prefix, [
		editor,
		shape.id,
	])
	const mainInput = useValue('main', () => getNodeInputPortValues(editor, shape.id).main, [
		editor,
		shape.id,
	])
	const suffixInput = useValue('suffix', () => getNodeInputPortValues(editor, shape.id).suffix, [
		editor,
		shape.id,
	])

	const sep = SEPARATORS.find((s) => s.id === node.separator)?.value ?? ' '
	const parts = [prefixInput?.value, mainInput?.value, suffixInput?.value].filter(
		(v): v is string => typeof v === 'string' && v.length > 0
	)
	const preview = parts.join(sep)

	return (
		<>
			<NodeRow>
				<Port shapeId={shape.id} portId="prefix" />
				<NodePortLabel dataType="text">Prefix</NodePortLabel>
				{prefixInput ? (
					<span className="NodeRow-connected-value">
						{typeof prefixInput.value === 'string' ? prefixInput.value.slice(0, 20) : 'connected'}
					</span>
				) : (
					<span className="NodeRow-disconnected">not connected</span>
				)}
			</NodeRow>
			<NodeRow>
				<Port shapeId={shape.id} portId="main" />
				<NodePortLabel dataType="text">Main</NodePortLabel>
				{mainInput ? (
					<span className="NodeRow-connected-value">
						{typeof mainInput.value === 'string' ? mainInput.value.slice(0, 20) : 'connected'}
					</span>
				) : (
					<span className="NodeRow-disconnected">not connected</span>
				)}
			</NodeRow>
			<NodeRow>
				<Port shapeId={shape.id} portId="suffix" />
				<NodePortLabel dataType="text">Suffix</NodePortLabel>
				{suffixInput ? (
					<span className="NodeRow-connected-value">
						{typeof suffixInput.value === 'string' ? suffixInput.value.slice(0, 20) : 'connected'}
					</span>
				) : (
					<span className="NodeRow-disconnected">not connected</span>
				)}
			</NodeRow>
			<NodeRow>
				<span className="NodeInputRow-label">Sep</span>
				<select
					value={node.separator}
					onChange={(e) =>
						updateNode<PromptConcatNode>(editor, shape, (n) => ({
							...n,
							separator: e.target.value,
						}))
					}
				>
					{SEPARATORS.map((s) => (
						<option key={s.id} value={s.id}>
							{s.label}
						</option>
					))}
				</select>
			</NodeRow>
			<NodeRow>
				<span className="NodeRow-connected-value" style={{ fontSize: 10, opacity: 0.7 }}>
					{preview ? (preview.length > 40 ? preview.slice(0, 38) + '...' : preview) : 'no inputs'}
				</span>
			</NodeRow>
		</>
	)
}
