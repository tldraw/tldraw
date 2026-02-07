import { T, useEditor, useValue } from 'tldraw'
import { BlendIcon } from '../../components/icons/BlendIcon'
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

/**
 * Simulate blending two images. In reality this would use canvas compositing.
 */
function simulateBlend(
	_imageA: string | null,
	_imageB: string | null,
	mode: string,
	opacity: number
): string {
	const hue =
		mode === 'multiply'
			? 300
			: mode === 'screen'
				? 60
				: mode === 'overlay'
					? 180
					: mode === 'difference'
						? 0
						: 120
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
		<rect width="512" height="512" fill="hsl(${hue}, 40%, 50%)" opacity="${opacity / 100}"/>
		<rect x="40" y="40" width="432" height="432" rx="16" fill="hsl(${hue + 30}, 30%, 60%)" opacity="0.7"/>
		<text x="256" y="256" text-anchor="middle" dominant-baseline="middle" fill="rgba(255,255,255,0.6)" font-family="sans-serif" font-size="16">${mode} blend</text>
		<text x="256" y="480" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-family="sans-serif" font-size="12">opacity: ${opacity}%</text>
	</svg>`
	return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export class BlendNodeDefinition extends NodeDefinition<BlendNode> {
	static type = 'blend'
	static validator = BlendNode
	title = 'Blend'
	heading = 'Blend'
	icon = (<BlendIcon />)
	category = 'process'
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
		await sleep(800)
		const imageA = inputs.imageA as string | null
		const imageB = inputs.imageB as string | null
		const result = simulateBlend(imageA, imageB, node.mode, node.opacity)
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
	const imageAInput = useValue(
		'imageA input',
		() => getNodeInputPortValues(editor, shape.id).imageA,
		[editor, shape.id]
	)
	const imageBInput = useValue(
		'imageB input',
		() => getNodeInputPortValues(editor, shape.id).imageB,
		[editor, shape.id]
	)

	return (
		<>
			<NodeRow>
				<Port shapeId={shape.id} portId="imageA" />
				<NodePortLabel dataType="image">Image A</NodePortLabel>
				{imageAInput ? (
					<span className="NodeRow-connected-value">
						{imageAInput.isOutOfDate || imageAInput.value === STOP_EXECUTION ? (
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
				<Port shapeId={shape.id} portId="imageB" />
				<NodePortLabel dataType="image">Image B</NodePortLabel>
				{imageBInput ? (
					<span className="NodeRow-connected-value">
						{imageBInput.isOutOfDate || imageBInput.value === STOP_EXECUTION ? (
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
				<select
					value={node.mode}
					onChange={(e) =>
						updateNode<BlendNode>(editor, shape, (n) => ({ ...n, mode: e.target.value }))
					}
				>
					{BLEND_MODES.map((m) => (
						<option key={m.id} value={m.id}>
							{m.label}
						</option>
					))}
				</select>
			</NodeRow>
			<NodeRow className="NodeInputRow">
				<span className="NodeInputRow-label">Opacity</span>
				<input
					type="range"
					min="0"
					max="100"
					value={node.opacity}
					onChange={(e) =>
						updateNode<BlendNode>(
							editor,
							shape,
							(n) => ({
								...n,
								opacity: Number(e.target.value),
							}),
							false
						)
					}
					onPointerDown={(e) => e.stopPropagation()}
				/>
				<span className="NodeRow-value">{node.opacity}%</span>
			</NodeRow>
			<div className="NodeImagePreview">
				{node.lastResultUrl ? (
					<img src={node.lastResultUrl} alt="Blended" />
				) : (
					<div className="NodeImagePreview-empty">
						<span>Connect images to blend</span>
					</div>
				)}
			</div>
		</>
	)
}
