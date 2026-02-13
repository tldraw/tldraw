import classNames from 'classnames'
import { T, useEditor, useValue } from 'tldraw'
import { apiStyleTransfer } from '../../api/pipelineApi'
import { StyleTransferIcon } from '../../components/icons/StyleTransferIcon'
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
	icon = (<StyleTransferIcon />)
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

	const styleInput = useValue('style input', () => getNodeInputPortValues(editor, shape.id).style, [
		editor,
		shape.id,
	])
	const contentInput = useValue(
		'content input',
		() => getNodeInputPortValues(editor, shape.id).content,
		[editor, shape.id]
	)
	const promptInput = useValue(
		'prompt input',
		() => getNodeInputPortValues(editor, shape.id).prompt,
		[editor, shape.id]
	)

	return (
		<>
			<NodeRow>
				<Port shapeId={shape.id} portId="style" />
				<NodePortLabel dataType="image">Style</NodePortLabel>
				{styleInput ? (
					<span className="NodeRow-connected-value">
						{styleInput.isOutOfDate || styleInput.value === STOP_EXECUTION ? (
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
				<Port shapeId={shape.id} portId="content" />
				<NodePortLabel dataType="image">Content</NodePortLabel>
				{contentInput ? (
					<span className="NodeRow-connected-value">
						{contentInput.isOutOfDate || contentInput.value === STOP_EXECUTION ? (
							<NodePlaceholder />
						) : (
							'connected'
						)}
					</span>
				) : (
					<span className="NodeRow-disconnected">optional</span>
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
					<span className="NodeRow-disconnected">optional</span>
				)}
			</NodeRow>
			<NodeRow>
				<span className="NodeInputRow-label">Model</span>
				<select
					value={node.model}
					onChange={(e) =>
						updateNode<StyleTransferNode>(editor, shape, (n) => ({
							...n,
							model: e.target.value,
						}))
					}
				>
					{STYLE_MODELS.map((m) => (
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
						updateNode<StyleTransferNode>(
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
			<div
				className={classNames('NodeImagePreview', {
					NodeImagePreview_loading: shape.props.isOutOfDate,
				})}
			>
				{node.lastResultUrl ? (
					<NodeImage src={node.lastResultUrl} alt="Style transfer result" />
				) : (
					<div className="NodeImagePreview-empty">
						<span>Connect a style image</span>
					</div>
				)}
			</div>
		</>
	)
}
