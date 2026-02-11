import classNames from 'classnames'
import { T, useEditor, useValue } from 'tldraw'
import { apiIPAdapter } from '../../api/pipelineApi'
import { IPAdapterIcon } from '../../components/icons/IPAdapterIcon'
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

export type IPAdapterNode = T.TypeOf<typeof IPAdapterNode>
export const IPAdapterNode = T.object({
	type: T.literal('ip_adapter'),
	scale: T.number,
	steps: T.number,
	lastResultUrl: T.string.nullable(),
})

export class IPAdapterNodeDefinition extends NodeDefinition<IPAdapterNode> {
	static type = 'ip_adapter'
	static validator = IPAdapterNode
	title = 'IP-Adapter'
	heading = 'IP-Adapter'
	hidden = true as const
	icon = (<IPAdapterIcon />)
	category = 'process'
	resultKeys = ['lastResultUrl'] as const
	getDefault(): IPAdapterNode {
		return {
			type: 'ip_adapter',
			scale: 60,
			steps: 30,
			lastResultUrl: null,
		}
	}
	getBodyHeightPx() {
		// image input + prompt input + scale row + steps row + preview
		return NODE_ROW_HEIGHT_PX * 4 + NODE_IMAGE_PREVIEW_HEIGHT_PX
	}
	getPorts(): Record<string, ShapePort> {
		const baseY = NODE_HEADER_HEIGHT_PX + NODE_ROW_HEADER_GAP_PX
		return {
			image: {
				id: 'image',
				x: 0,
				y: baseY + NODE_ROW_HEIGHT_PX * 0.5,
				terminal: 'end',
				dataType: 'image',
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
				dataType: 'image',
			},
		}
	}
	async execute(
		shape: NodeShape,
		node: IPAdapterNode,
		inputs: InputValues
	): Promise<ExecutionResult> {
		const imageUrl = (inputs.image as string) ?? ''
		const prompt = (inputs.prompt as string) ?? ''

		const result = await apiIPAdapter({
			imageUrl,
			prompt,
			scale: node.scale / 100,
			steps: node.steps,
		})

		updateNode<IPAdapterNode>(this.editor, shape, (n) => ({
			...n,
			lastResultUrl: result.imageUrl,
		}))
		return { output: result.imageUrl }
	}
	getOutputInfo(shape: NodeShape, node: IPAdapterNode, inputs: InfoValues): InfoValues {
		return {
			output: {
				value: node.lastResultUrl,
				isOutOfDate: areAnyInputsOutOfDate(inputs) || shape.props.isOutOfDate,
				dataType: 'image',
			},
		}
	}
	Component = IPAdapterNodeComponent
}

function IPAdapterNodeComponent({ shape, node }: NodeComponentProps<IPAdapterNode>) {
	const editor = useEditor()

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
			<NodeRow className="NodeInputRow">
				<span className="NodeInputRow-label">Scale</span>
				<input
					type="range"
					min="0"
					max="100"
					value={node.scale}
					onChange={(e) =>
						updateNode<IPAdapterNode>(
							editor,
							shape,
							(n) => ({ ...n, scale: Number(e.target.value) }),
							false
						)
					}
					onPointerDown={(e) => e.stopPropagation()}
				/>
				<span className="NodeRow-value">{node.scale}%</span>
			</NodeRow>
			<NodeRow className="NodeInputRow">
				<span className="NodeInputRow-label">Steps</span>
				<input
					type="range"
					min="1"
					max="50"
					value={node.steps}
					onChange={(e) =>
						updateNode<IPAdapterNode>(
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
					<NodeImage src={node.lastResultUrl} alt="IP-Adapter result" />
				) : (
					<div className="NodeImagePreview-empty">
						<span>Connect a reference image</span>
					</div>
				)}
			</div>
		</>
	)
}
