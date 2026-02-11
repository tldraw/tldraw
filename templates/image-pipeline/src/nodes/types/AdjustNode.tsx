import classNames from 'classnames'
import { T, useEditor, useValue } from 'tldraw'
import { AdjustIcon } from '../../components/icons/AdjustIcon'
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
	blobToDataUrl,
	ExecutionResult,
	InfoValues,
	InputValues,
	loadImage,
	NodeComponentProps,
	NodeDefinition,
	NodeImage,
	NodePlaceholder,
	NodePortLabel,
	NodeRow,
	STOP_EXECUTION,
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
	icon = (<AdjustIcon />)
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
	const imageInput = useValue('image input', () => getNodeInputPortValues(editor, shape.id).image, [
		editor,
		shape.id,
	])

	const makeSlider = (
		label: string,
		field: 'brightness' | 'contrast' | 'saturation',
		min: number,
		max: number
	) => (
		<NodeRow className="NodeInputRow">
			<span className="NodeInputRow-label">{label}</span>
			<input
				type="range"
				min={min}
				max={max}
				value={node[field]}
				onChange={(e) =>
					updateNode<AdjustNode>(
						editor,
						shape,
						(n) => ({
							...n,
							[field]: Number(e.target.value),
						}),
						false
					)
				}
				onPointerDown={(e) => e.stopPropagation()}
			/>
			<span className="NodeRow-value">{node[field]}</span>
		</NodeRow>
	)

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
			{makeSlider('Brightness', 'brightness', -50, 50)}
			{makeSlider('Contrast', 'contrast', -50, 50)}
			{makeSlider('Saturation', 'saturation', -50, 50)}
			<div
				className={classNames('NodeImagePreview', {
					NodeImagePreview_loading: shape.props.isOutOfDate,
				})}
			>
				{node.lastResultUrl ? (
					<NodeImage src={node.lastResultUrl} alt="Adjusted" />
				) : (
					<div className="NodeImagePreview-empty">
						<span>Connect an image</span>
					</div>
				)}
			</div>
		</>
	)
}
