import classNames from 'classnames'
import { T, useEditor, useValue } from 'tldraw'
import { apiUpscale } from '../../api/pipelineApi'
import { UpscaleIcon } from '../../components/icons/UpscaleIcon'
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

const SCALE_FACTORS = [
	{ id: '2', label: '2x' },
	{ id: '4', label: '4x' },
] as const

const METHODS = [
	{ id: 'bilinear', label: 'Bilinear' },
	{ id: 'lanczos', label: 'Lanczos' },
	{ id: 'ai_enhanced', label: 'AI enhanced' },
] as const

export type UpscaleNode = T.TypeOf<typeof UpscaleNode>
export const UpscaleNode = T.object({
	type: T.literal('upscale'),
	scale: T.string,
	method: T.string,
	lastResultUrl: T.string.nullable(),
})

export class UpscaleNodeDefinition extends NodeDefinition<UpscaleNode> {
	static type = 'upscale'
	static validator = UpscaleNode
	title = 'Upscale'
	heading = 'Upscale'
	hidden = true as const
	icon = (<UpscaleIcon />)
	category = 'process'
	resultKeys = ['lastResultUrl'] as const
	getDefault(): UpscaleNode {
		return {
			type: 'upscale',
			scale: '2',
			method: 'lanczos',
			lastResultUrl: null,
		}
	}
	getBodyHeightPx() {
		return NODE_ROW_HEIGHT_PX * 3 + NODE_IMAGE_PREVIEW_HEIGHT_PX
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
		node: UpscaleNode,
		inputs: InputValues
	): Promise<ExecutionResult> {
		const imageUrl = (inputs.image as string) ?? ''

		const result = await apiUpscale({
			imageUrl,
			scale: Number(node.scale) || 2,
			method: node.method,
		})

		updateNode<UpscaleNode>(this.editor, shape, (n) => ({
			...n,
			lastResultUrl: result.imageUrl,
		}))
		return { output: result.imageUrl }
	}
	getOutputInfo(shape: NodeShape, node: UpscaleNode, inputs: InfoValues): InfoValues {
		return {
			output: {
				value: node.lastResultUrl,
				isOutOfDate: areAnyInputsOutOfDate(inputs) || shape.props.isOutOfDate,
				dataType: 'image',
			},
		}
	}
	Component = UpscaleNodeComponent
}

function UpscaleNodeComponent({ shape, node }: NodeComponentProps<UpscaleNode>) {
	const editor = useEditor()
	const imageInput = useValue('image input', () => getNodeInputPortValues(editor, shape.id).image, [
		editor,
		shape.id,
	])

	return (
		<>
			<NodeRow>
				<Port shapeId={shape.id} portId="image" />
				<NodePortLabel dataType="image">Image</NodePortLabel>
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
				<span className="NodeInputRow-label">Scale</span>
				<select
					value={node.scale}
					onChange={(e) =>
						updateNode<UpscaleNode>(editor, shape, (n) => ({
							...n,
							scale: e.target.value,
						}))
					}
				>
					{SCALE_FACTORS.map((s) => (
						<option key={s.id} value={s.id}>
							{s.label}
						</option>
					))}
				</select>
			</NodeRow>
			<NodeRow>
				<span className="NodeInputRow-label">Method</span>
				<select
					value={node.method}
					onChange={(e) =>
						updateNode<UpscaleNode>(editor, shape, (n) => ({
							...n,
							method: e.target.value,
						}))
					}
				>
					{METHODS.map((m) => (
						<option key={m.id} value={m.id}>
							{m.label}
						</option>
					))}
				</select>
			</NodeRow>
			<div
				className={classNames('NodeImagePreview', {
					NodeImagePreview_loading: shape.props.isOutOfDate,
				})}
			>
				{node.lastResultUrl ? (
					<NodeImage src={node.lastResultUrl} alt="Upscaled" />
				) : (
					<div className="NodeImagePreview-empty">
						<span>Connect an image to upscale</span>
					</div>
				)}
			</div>
		</>
	)
}
