import classNames from 'classnames'
import { T, useEditor, useValue } from 'tldraw'
import { PreviewIcon } from '../../components/icons/PreviewIcon'
import {
	NODE_HEADER_HEIGHT_PX,
	NODE_IMAGE_PREVIEW_HEIGHT_PX,
	NODE_ROW_HEADER_GAP_PX,
	NODE_ROW_HEIGHT_PX,
} from '../../constants'
import { Port, ShapePort } from '../../ports/Port'
import { sleep } from '../../utils/sleep'
import { getNodeInputPortValues } from '../nodePorts'
import { NodeShape } from '../NodeShapeUtil'
import {
	ExecutionResult,
	InfoValues,
	InputValues,
	NodeComponentProps,
	NodeDefinition,
	NodeImage,
	NodePortLabel,
	NodeRow,
	STOP_EXECUTION,
	updateNode,
} from './shared'

export type PreviewNode = T.TypeOf<typeof PreviewNode>
export const PreviewNode = T.object({
	type: T.literal('preview'),
	lastImageUrl: T.string.nullable(),
})

export class PreviewNodeDefinition extends NodeDefinition<PreviewNode> {
	static type = 'preview'
	static validator = PreviewNode
	title = 'Preview'
	heading = 'Preview'
	icon = (<PreviewIcon />)
	category = 'output'
	resultKeys = ['lastImageUrl'] as const
	getDefault(): PreviewNode {
		return {
			type: 'preview',
			lastImageUrl: null,
		}
	}
	getBodyHeightPx() {
		return NODE_ROW_HEIGHT_PX + NODE_IMAGE_PREVIEW_HEIGHT_PX
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
			// No output port — this is a terminal/sink node
		}
	}
	async execute(
		shape: NodeShape,
		_node: PreviewNode,
		inputs: InputValues
	): Promise<ExecutionResult> {
		await sleep(200)
		const imageUrl = inputs.image as string | null
		updateNode<PreviewNode>(this.editor, shape, (n) => ({
			...n,
			lastImageUrl: imageUrl ?? null,
		}))
		return {}
	}
	getOutputInfo(): InfoValues {
		return {}
	}
	Component = PreviewNodeComponent
}

function PreviewNodeComponent({ shape, node }: NodeComponentProps<PreviewNode>) {
	const editor = useEditor()
	const imageInput = useValue('image input', () => getNodeInputPortValues(editor, shape.id).image, [
		editor,
		shape.id,
	])

	const displayUrl =
		imageInput && !imageInput.isOutOfDate && imageInput.value !== STOP_EXECUTION
			? (imageInput.value as string)
			: node.lastImageUrl

	return (
		<>
			<NodeRow>
				<Port shapeId={shape.id} portId="image" />
				<NodePortLabel dataType="image">Image</NodePortLabel>
				{imageInput ? (
					<span className="NodeRow-connected-value">connected</span>
				) : (
					<span className="NodeRow-disconnected">not connected</span>
				)}
			</NodeRow>
			<div
				className={classNames('NodeImagePreview', {
					NodeImagePreview_loading: shape.props.isOutOfDate,
				})}
			>
				{displayUrl ? (
					<NodeImage src={displayUrl} alt="Preview" />
				) : (
					<div className="NodeImagePreview-empty">
						<span>No image to preview</span>
					</div>
				)}
			</div>
		</>
	)
}
