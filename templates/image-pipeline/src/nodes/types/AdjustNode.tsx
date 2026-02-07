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

function simulateAdjust(brightness: number, contrast: number, saturation: number): string {
	const l = 50 + brightness
	const s = Math.max(0, 50 + saturation)
	const c = Math.max(10, 40 + contrast)
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
		<rect width="512" height="512" fill="hsl(220, ${s}%, ${l}%)"/>
		<circle cx="256" cy="200" r="100" fill="hsl(40, ${s + 10}%, ${l + 10}%)"/>
		<rect x="100" y="330" width="312" height="80" rx="8" fill="hsl(140, ${c}%, ${l - 5}%)"/>
		<text x="256" y="480" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-family="sans-serif" font-size="12">B:${brightness} C:${contrast} S:${saturation}</text>
	</svg>`
	return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export class AdjustNodeDefinition extends NodeDefinition<AdjustNode> {
	static type = 'adjust'
	static validator = AdjustNode
	title = 'Adjust'
	heading = 'Adjust'
	icon = (<AdjustIcon />)
	category = 'process'
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
	async execute(
		shape: NodeShape,
		node: AdjustNode,
		_inputs: InputValues
	): Promise<ExecutionResult> {
		await sleep(500)
		const result = simulateAdjust(node.brightness, node.contrast, node.saturation)
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
			<div className="NodeImagePreview">
				{node.lastResultUrl ? (
					<img src={node.lastResultUrl} alt="Adjusted" />
				) : (
					<div className="NodeImagePreview-empty">
						<span>Connect an image</span>
					</div>
				)}
			</div>
		</>
	)
}
