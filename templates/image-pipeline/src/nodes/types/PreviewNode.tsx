import { T } from 'tldraw'
import { PreviewIcon } from '../../components/icons/PreviewIcon'
import {
	NODE_HEADER_HEIGHT_PX,
	NODE_IMAGE_PREVIEW_HEIGHT_PX,
	NODE_ROW_HEADER_GAP_PX,
	NODE_ROW_HEIGHT_PX,
} from '../../constants'
import { ShapePort } from '../../ports/Port'
import { sleep } from '../../utils/sleep'
import { NodeShape } from '../NodeShapeUtil'
import {
	ExecutionResult,
	InfoValues,
	InputValues,
	NodeComponentProps,
	NodeDefinition,
	NodeImagePreview,
	NodePortRow,
	STOP_EXECUTION,
	updateNode,
	useNodeInput,
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
	icon = <PreviewIcon />
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
		}
	}
	async execute(
		shape: NodeShape,
		_node: PreviewNode,
		inputs: InputValues
	): Promise<ExecutionResult> {
		await sleep(200)
		const imageUrl = (inputs.image as string | null) ?? null
		updateNode<PreviewNode>(this.editor, shape, (n) => ({ ...n, lastImageUrl: imageUrl }))
		return {}
	}
	getOutputInfo(): InfoValues {
		return {}
	}
	Component = PreviewNodeComponent
}

function PreviewNodeComponent({ shape, node }: NodeComponentProps<PreviewNode>) {
	const imageInput = useNodeInput(shape.id, 'image')

	const displayUrl =
		imageInput && !imageInput.isOutOfDate && imageInput.value !== STOP_EXECUTION
			? (imageInput.value as string)
			: node.lastImageUrl

	return (
		<>
			<NodePortRow shapeId={shape.id} portId="image" dataType="image" label="Image" />
			<NodeImagePreview
				src={displayUrl}
				alt="Preview"
				emptyText="No image to preview"
				isLoading={shape.props.isOutOfDate}
			/>
		</>
	)
}
