import { T, useEditor } from 'tldraw'
import { BlendIcon } from '../../components/icons/BlendIcon'
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
	NodeSelectRow,
	NodeSliderRow,
	updateNode,
} from './shared'

const BLEND_MODES = [
	{ id: 'normal', label: 'Normal' },
	{ id: 'multiply', label: 'Multiply' },
	{ id: 'screen', label: 'Screen' },
	{ id: 'overlay', label: 'Overlay' },
	{ id: 'difference', label: 'Difference' },
] as const

export type BlendNode = T.TypeOf<typeof BlendNode>
export const BlendNode = T.object({
	type: T.literal('blend'),
	mode: T.string,
	opacity: T.number,
	lastResultUrl: T.string.nullable(),
})

const COMPOSITE_OPS: Record<string, GlobalCompositeOperation> = {
	normal: 'source-over',
	multiply: 'multiply',
	screen: 'screen',
	overlay: 'overlay',
	difference: 'difference',
}

async function blendImages(
	imageAUrl: string,
	imageBUrl: string,
	mode: string,
	opacity: number
): Promise<string> {
	const [imgA, imgB] = await Promise.all([loadImage(imageAUrl), loadImage(imageBUrl)])
	const w = Math.max(imgA.naturalWidth, imgB.naturalWidth)
	const h = Math.max(imgA.naturalHeight, imgB.naturalHeight)
	const canvas = new OffscreenCanvas(w, h)
	const ctx = canvas.getContext('2d')!
	ctx.drawImage(imgA, 0, 0, w, h)
	ctx.globalCompositeOperation = COMPOSITE_OPS[mode] ?? 'source-over'
	ctx.globalAlpha = opacity / 100
	ctx.drawImage(imgB, 0, 0, w, h)
	const blob = await canvas.convertToBlob({ type: 'image/png' })
	return blobToDataUrl(blob)
}

export class BlendNodeDefinition extends NodeDefinition<BlendNode> {
	static type = 'blend'
	static validator = BlendNode
	title = 'Blend'
	heading = 'Blend'
	icon = <BlendIcon />
	category = 'process'
	resultKeys = ['lastResultUrl'] as const
	getDefault(): BlendNode {
		return {
			type: 'blend',
			mode: 'normal',
			opacity: 50,
			lastResultUrl: null,
		}
	}
	getBodyHeightPx() {
		return NODE_ROW_HEIGHT_PX * 4 + NODE_IMAGE_PREVIEW_HEIGHT_PX
	}
	getPorts(): Record<string, ShapePort> {
		const baseY = NODE_HEADER_HEIGHT_PX + NODE_ROW_HEADER_GAP_PX
		return {
			imageA: {
				id: 'imageA',
				x: 0,
				y: baseY + NODE_ROW_HEIGHT_PX * 0.5,
				terminal: 'end',
				dataType: 'image',
			},
			imageB: {
				id: 'imageB',
				x: 0,
				y: baseY + NODE_ROW_HEIGHT_PX * 1.5,
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
	async execute(shape: NodeShape, node: BlendNode, inputs: InputValues): Promise<ExecutionResult> {
		const imageA = inputs.imageA as string | null
		const imageB = inputs.imageB as string | null

		const result =
			imageA && imageB
				? await blendImages(imageA, imageB, node.mode, node.opacity)
				: imageA || imageB || null

		updateNode<BlendNode>(this.editor, shape, (n) => ({
			...n,
			lastResultUrl: result,
		}))
		return { output: result }
	}
	getOutputInfo(shape: NodeShape, node: BlendNode, inputs: InfoValues): InfoValues {
		return {
			output: {
				value: node.lastResultUrl,
				isOutOfDate: areAnyInputsOutOfDate(inputs) || shape.props.isOutOfDate,
				dataType: 'image',
			},
		}
	}
	Component = BlendNodeComponent
}

function BlendNodeComponent({ shape, node }: NodeComponentProps<BlendNode>) {
	const editor = useEditor()

	return (
		<>
			<NodePortRow shapeId={shape.id} portId="imageA" dataType="image" label="Image A" />
			<NodePortRow shapeId={shape.id} portId="imageB" dataType="image" label="Image B" />
			<NodeSelectRow
				value={node.mode}
				options={BLEND_MODES}
				onChange={(mode) => updateNode<BlendNode>(editor, shape, (n) => ({ ...n, mode }))}
			/>
			<NodeSliderRow
				label="Opacity"
				min={0}
				max={100}
				suffix="%"
				value={node.opacity}
				onChange={(opacity) =>
					updateNode<BlendNode>(editor, shape, (n) => ({ ...n, opacity }), false)
				}
			/>
			<NodeImagePreview
				src={node.lastResultUrl}
				alt="Blended"
				emptyText="Connect images to blend"
				isLoading={shape.props.isOutOfDate}
			/>
		</>
	)
}
