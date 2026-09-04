import { T, useEditor } from 'tldraw'
import { AdjustIcon } from '../../components/icons/AdjustIcon'
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
	blobToDataUrl,
	ExecutionResult,
	InfoValues,
	InputValues,
	loadImage,
	NodeComponentProps,
	NodeDefinition,
	NodeImagePreview,
	NodePortRow,
	NodeSliderRow,
	updateNode,
} from './shared'

export type AdjustNode = T.TypeOf<typeof AdjustNode>
export const AdjustNode = T.object({
	type: T.literal('adjust'),
	brightness: T.number,
	contrast: T.number,
	saturation: T.number,
	lastResultUrl: T.string.nullable(),
})

async function adjustImage(
	imageUrl: string,
	brightness: number,
	contrast: number,
	saturation: number
): Promise<string> {
	const img = await loadImage(imageUrl)
	const w = img.naturalWidth
	const h = img.naturalHeight
	const canvas = new OffscreenCanvas(w, h)
	const ctx = canvas.getContext('2d')!
	// Map slider ranges (-50..50) to CSS filter multipliers
	const b = 1 + brightness / 50 // 0.0 – 2.0, default 1.0
	const c = 1 + contrast / 50 // 0.0 – 2.0, default 1.0
	const s = 1 + saturation / 50 // 0.0 – 2.0, default 1.0
	ctx.filter = `brightness(${b}) contrast(${c}) saturate(${s})`
	ctx.drawImage(img, 0, 0, w, h)
	const blob = await canvas.convertToBlob({ type: 'image/png' })
	return blobToDataUrl(blob)
}

export class AdjustNodeDefinition extends NodeDefinition<AdjustNode> {
	static type = 'adjust'
	static validator = AdjustNode
	title = 'Adjust'
	heading = 'Adjust'
	icon = <AdjustIcon />
	category = 'process'
	resultKeys = ['lastResultUrl'] as const
	getDefault(): AdjustNode {
		return {
			type: 'adjust',
			brightness: 0,
			contrast: 0,
			saturation: 0,
			lastResultUrl: null,
		}
	}
	getBodyHeightPx() {
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
			output: {
				id: 'output',
				x: NODE_WIDTH_PX,
				y: NODE_HEADER_HEIGHT_PX / 2,
				terminal: 'start',
				dataType: 'image',
			},
		}
	}
	async execute(shape: NodeShape, node: AdjustNode, inputs: InputValues): Promise<ExecutionResult> {
		const imageUrl = inputs.image as string | null
		if (!imageUrl) {
			updateNode<AdjustNode>(this.editor, shape, (n) => ({ ...n, lastResultUrl: null }))
			return { output: null }
		}
		const result = await adjustImage(imageUrl, node.brightness, node.contrast, node.saturation)
		updateNode<AdjustNode>(this.editor, shape, (n) => ({
			...n,
			lastResultUrl: result,
		}))
		return { output: result }
	}
	getOutputInfo(shape: NodeShape, node: AdjustNode, inputs: InfoValues): InfoValues {
		return {
			output: {
				value: node.lastResultUrl,
				isOutOfDate: areAnyInputsOutOfDate(inputs) || shape.props.isOutOfDate,
				dataType: 'image',
			},
		}
	}
	Component = AdjustNodeComponent
}

function AdjustNodeComponent({ shape, node }: NodeComponentProps<AdjustNode>) {
	const editor = useEditor()

	const slider = (label: string, field: 'brightness' | 'contrast' | 'saturation') => (
		<NodeSliderRow
			label={label}
			min={-50}
			max={50}
			value={node[field]}
			onChange={(value) =>
				updateNode<AdjustNode>(editor, shape, (n) => ({ ...n, [field]: value }), false)
			}
		/>
	)

	return (
		<>
			<NodePortRow shapeId={shape.id} portId="image" dataType="image" label="Image" />
			{slider('Brightness', 'brightness')}
			{slider('Contrast', 'contrast')}
			{slider('Saturation', 'saturation')}
			<NodeImagePreview
				src={node.lastResultUrl}
				alt="Adjusted"
				emptyText="Connect an image"
				isLoading={shape.props.isOutOfDate}
			/>
		</>
	)
}
