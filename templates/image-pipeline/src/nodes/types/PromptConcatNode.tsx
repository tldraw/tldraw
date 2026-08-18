import { T, useEditor } from 'tldraw'
import { PromptConcatIcon } from '../../components/icons/PromptConcatIcon'
import {
	NODE_HEADER_HEIGHT_PX,
	NODE_ROW_HEADER_GAP_PX,
	NODE_ROW_HEIGHT_PX,
	NODE_WIDTH_PX,
} from '../../constants'
import { ShapePort } from '../../ports/Port'
import { sleep } from '../../utils/sleep'
import { NodeShape } from '../NodeShapeUtil'
import {
	areAnyInputsOutOfDate,
	ExecutionResult,
	InfoValue,
	InfoValues,
	InputValues,
	NodeComponentProps,
	NodeDefinition,
	NodePortRow,
	NodeRow,
	NodeSelectRow,
	updateNode,
	useNodeInput,
} from './shared'

const SEPARATORS = [
	{ id: 'space', label: 'Space', value: ' ' },
	{ id: 'newline', label: 'Newline', value: '\n' },
	{ id: 'comma', label: 'Comma', value: ', ' },
	{ id: 'none', label: 'None', value: '' },
] as const

/** Join the non-empty string parts with the separator named by `separatorId`. */
function joinParts(parts: unknown[], separatorId: string) {
	const sep = SEPARATORS.find((s) => s.id === separatorId)?.value ?? ' '
	return parts.filter((v): v is string => typeof v === 'string' && v.length > 0).join(sep)
}

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
	icon = <PromptConcatIcon />
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
		return { output: joinParts([inputs.prefix, inputs.main, inputs.suffix], node.separator) }
	}
	getOutputInfo(shape: NodeShape, node: PromptConcatNode, inputs: InfoValues): InfoValues {
		const joined = joinParts(
			[inputs.prefix?.value, inputs.main?.value, inputs.suffix?.value],
			node.separator
		)
		return {
			output: {
				value: joined || null,
				isOutOfDate: areAnyInputsOutOfDate(inputs) || shape.props.isOutOfDate,
				dataType: 'text',
			},
		}
	}
	Component = PromptConcatNodeComponent
}

function PromptConcatNodeComponent({ shape, node }: NodeComponentProps<PromptConcatNode>) {
	const editor = useEditor()

	const prefixInput = useNodeInput(shape.id, 'prefix')
	const mainInput = useNodeInput(shape.id, 'main')
	const suffixInput = useNodeInput(shape.id, 'suffix')

	const preview = joinParts(
		[prefixInput?.value, mainInput?.value, suffixInput?.value],
		node.separator
	)

	const renderText = (input: InfoValue) =>
		typeof input.value === 'string' ? input.value.slice(0, 20) : 'connected'

	return (
		<>
			<NodePortRow
				shapeId={shape.id}
				portId="prefix"
				dataType="text"
				label="Prefix"
				renderValue={renderText}
			/>
			<NodePortRow
				shapeId={shape.id}
				portId="main"
				dataType="text"
				label="Main"
				renderValue={renderText}
			/>
			<NodePortRow
				shapeId={shape.id}
				portId="suffix"
				dataType="text"
				label="Suffix"
				renderValue={renderText}
			/>
			<NodeSelectRow
				label="Sep"
				value={node.separator}
				options={SEPARATORS}
				onChange={(separator) =>
					updateNode<PromptConcatNode>(editor, shape, (n) => ({ ...n, separator }))
				}
			/>
			<NodeRow>
				<span className="NodeRow-connected-value" style={{ fontSize: 10, opacity: 0.7 }}>
					{preview ? (preview.length > 40 ? preview.slice(0, 38) + '...' : preview) : 'no inputs'}
				</span>
			</NodeRow>
		</>
	)
}
