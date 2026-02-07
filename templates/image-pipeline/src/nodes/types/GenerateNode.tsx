import { T, useEditor, useValue } from 'tldraw'
import { GenerateIcon } from '../../components/icons/GenerateIcon'
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

export type GenerateNode = T.TypeOf<typeof GenerateNode>
export const GenerateNode = T.object({
	type: T.literal('generate'),
	steps: T.number,
	cfgScale: T.number,
	seed: T.number,
	lastResultUrl: T.string.nullable(),
})

/**
 * Generate a deterministic placeholder image URL based on a seed and prompt.
 * In a real app, this would call an image generation API.
 */
function generatePlaceholderImage(seed: number, prompt: string): string {
	const hue = (((seed * 137 + prompt.length * 43) % 360) + 360) % 360
	const saturation = 60 + (seed % 30)
	const lightness = 45 + ((seed * 7) % 20)
	const hue2 = (hue + 40 + (prompt.length % 60)) % 360

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
		<defs>
			<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" style="stop-color:hsl(${hue},${saturation}%,${lightness}%)"/>
				<stop offset="100%" style="stop-color:hsl(${hue2},${saturation}%,${lightness + 10}%)"/>
			</linearGradient>
			<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.${65 + (seed % 30)}" numOctaves="4" seed="${seed}"/><feColorMatrix type="saturate" values="0"/><feBlend in="SourceGraphic" mode="overlay"/></filter>
		</defs>
		<rect width="512" height="512" fill="url(#bg)" filter="url(#n)"/>
		<text x="256" y="480" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-family="sans-serif" font-size="14">seed: ${seed}</text>
	</svg>`
	return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export class GenerateNodeDefinition extends NodeDefinition<GenerateNode> {
	static type = 'generate'
	static validator = GenerateNode
	title = 'Generate'
	heading = 'Generate'
	icon = (<GenerateIcon />)
	category = 'process'
	getDefault(): GenerateNode {
		return {
			type: 'generate',
			steps: 20,
			cfgScale: 7,
			seed: Math.floor(Math.random() * 99999),
			lastResultUrl: null,
		}
	}
	getBodyHeightPx() {
		// 3 port rows + image preview + 3 parameter rows
		return NODE_ROW_HEIGHT_PX * 6 + NODE_IMAGE_PREVIEW_HEIGHT_PX
	}
	getPorts(_shape: NodeShape, _node: GenerateNode): Record<string, ShapePort> {
		const baseY = NODE_HEADER_HEIGHT_PX + NODE_ROW_HEADER_GAP_PX
		return {
			model: {
				id: 'model',
				x: 0,
				y: baseY + NODE_ROW_HEIGHT_PX * 0.5,
				terminal: 'end',
				dataType: 'model',
			},
			prompt: {
				id: 'prompt',
				x: 0,
				y: baseY + NODE_ROW_HEIGHT_PX * 1.5,
				terminal: 'end',
				dataType: 'text',
			},
			negative: {
				id: 'negative',
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
		node: GenerateNode,
		inputs: InputValues
	): Promise<ExecutionResult> {
		// Simulate generation time proportional to steps
		await sleep(Math.min(node.steps * 50, 2000))

		const prompt = (inputs.prompt as string) ?? 'default'
		const imageUrl = generatePlaceholderImage(node.seed, prompt)

		updateNode<GenerateNode>(this.editor, shape, (n) => ({
			...n,
			lastResultUrl: imageUrl,
		}))

		return { output: imageUrl }
	}
	getOutputInfo(shape: NodeShape, node: GenerateNode, inputs: InfoValues): InfoValues {
		return {
			output: {
				value: node.lastResultUrl,
				isOutOfDate: areAnyInputsOutOfDate(inputs) || shape.props.isOutOfDate,
				dataType: 'image',
			},
		}
	}
	Component = GenerateNodeComponent
}

function GenerateNodeComponent({ shape, node }: NodeComponentProps<GenerateNode>) {
	const editor = useEditor()

	const modelInput = useValue('model input', () => getNodeInputPortValues(editor, shape.id).model, [
		editor,
		shape.id,
	])
	const promptInput = useValue(
		'prompt input',
		() => getNodeInputPortValues(editor, shape.id).prompt,
		[editor, shape.id]
	)
	const negativeInput = useValue(
		'negative input',
		() => getNodeInputPortValues(editor, shape.id).negative,
		[editor, shape.id]
	)

	return (
		<>
			<NodeRow>
				<Port shapeId={shape.id} portId="model" />
				<NodePortLabel dataType="model">Model</NodePortLabel>
				{modelInput ? (
					<span className="NodeRow-connected-value">
						{modelInput.isOutOfDate ? <NodePlaceholder /> : String(modelInput.value)}
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
						{promptInput.isOutOfDate ? (
							<NodePlaceholder />
						) : (
							<span title={String(promptInput.value)}>
								{String(promptInput.value ?? '').slice(0, 20)}
								{String(promptInput.value ?? '').length > 20 ? '...' : ''}
							</span>
						)}
					</span>
				) : (
					<span className="NodeRow-disconnected">not connected</span>
				)}
			</NodeRow>
			<NodeRow>
				<Port shapeId={shape.id} portId="negative" />
				<NodePortLabel dataType="text">Negative</NodePortLabel>
				{negativeInput ? (
					<span className="NodeRow-connected-value">
						{negativeInput.isOutOfDate || negativeInput.value === STOP_EXECUTION ? (
							<NodePlaceholder />
						) : (
							<span title={String(negativeInput.value)}>
								{String(negativeInput.value ?? '').slice(0, 20)}
							</span>
						)}
					</span>
				) : (
					<span className="NodeRow-disconnected">optional</span>
				)}
			</NodeRow>
			<div className="NodeImagePreview">
				{node.lastResultUrl ? (
					<img src={node.lastResultUrl} alt="Generated" />
				) : (
					<div className="NodeImagePreview-empty">
						<span>Run pipeline to generate</span>
					</div>
				)}
			</div>
			<NodeRow className="NodeInputRow">
				<span className="NodeInputRow-label">Steps</span>
				<input
					type="range"
					min="1"
					max="100"
					value={node.steps}
					onChange={(e) =>
						updateNode<GenerateNode>(
							editor,
							shape,
							(n) => ({
								...n,
								steps: Number(e.target.value),
							}),
							false
						)
					}
					onPointerDown={(e) => e.stopPropagation()}
				/>
				<span className="NodeRow-value">{node.steps}</span>
			</NodeRow>
			<NodeRow className="NodeInputRow">
				<span className="NodeInputRow-label">CFG</span>
				<input
					type="range"
					min="1"
					max="30"
					step="0.5"
					value={node.cfgScale}
					onChange={(e) =>
						updateNode<GenerateNode>(
							editor,
							shape,
							(n) => ({
								...n,
								cfgScale: Number(e.target.value),
							}),
							false
						)
					}
					onPointerDown={(e) => e.stopPropagation()}
				/>
				<span className="NodeRow-value">{node.cfgScale}</span>
			</NodeRow>
			<NodeRow className="NodeInputRow">
				<span className="NodeInputRow-label">Seed</span>
				<input
					type="text"
					inputMode="numeric"
					value={node.seed}
					onChange={(e) => {
						const v = parseInt(e.target.value, 10)
						if (!isNaN(v)) {
							updateNode<GenerateNode>(editor, shape, (n) => ({
								...n,
								seed: Math.max(0, v),
							}))
						}
					}}
					onPointerDown={(e) => e.stopPropagation()}
					onFocus={() => editor.setSelectedShapes([shape.id])}
				/>
			</NodeRow>
		</>
	)
}
