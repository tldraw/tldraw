import { T, useEditor, useValue } from 'tldraw'
import { ControlNetIcon } from '../../components/icons/ControlNetIcon'
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

const CONTROL_MODES = [
	{ id: 'canny', label: 'Canny edge' },
	{ id: 'depth', label: 'Depth map' },
	{ id: 'pose', label: 'Pose' },
	{ id: 'segmentation', label: 'Segmentation' },
] as const

export type ControlNetNode = T.TypeOf<typeof ControlNetNode>
export const ControlNetNode = T.object({
	type: T.literal('controlnet'),
	mode: T.string,
	strength: T.number,
	steps: T.number,
	lastResultUrl: T.string.nullable(),
})

function simulateControlNet(mode: string, strength: number, steps: number): string {
	const hue = mode === 'canny' ? 180 : mode === 'depth' ? 220 : mode === 'pose' ? 30 : 120
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
		<rect width="512" height="512" fill="hsl(${hue}, 30%, 20%)"/>
		<g opacity="${strength / 100}">
			${
				mode === 'canny'
					? `
				<path d="M100 400 L200 200 L300 300 L400 100" stroke="hsl(${hue},80%,70%)" stroke-width="3" fill="none"/>
				<path d="M80 350 L180 180 L280 250 L420 80" stroke="hsl(${hue},60%,60%)" stroke-width="2" fill="none"/>
			`
					: mode === 'depth'
						? `
				<rect x="60" y="60" width="392" height="392" rx="8" fill="hsl(${hue},20%,40%)"/>
				<rect x="120" y="120" width="272" height="272" rx="8" fill="hsl(${hue},20%,55%)"/>
				<rect x="180" y="180" width="152" height="152" rx="8" fill="hsl(${hue},20%,70%)"/>
			`
						: mode === 'pose'
							? `
				<circle cx="256" cy="120" r="30" stroke="hsl(${hue},80%,60%)" stroke-width="3" fill="none"/>
				<line x1="256" y1="150" x2="256" y2="300" stroke="hsl(${hue},80%,60%)" stroke-width="3"/>
				<line x1="256" y1="200" x2="180" y2="260" stroke="hsl(${hue},80%,60%)" stroke-width="3"/>
				<line x1="256" y1="200" x2="332" y2="260" stroke="hsl(${hue},80%,60%)" stroke-width="3"/>
				<line x1="256" y1="300" x2="190" y2="400" stroke="hsl(${hue},80%,60%)" stroke-width="3"/>
				<line x1="256" y1="300" x2="322" y2="400" stroke="hsl(${hue},80%,60%)" stroke-width="3"/>
			`
							: `
				<rect x="60" y="200" width="160" height="200" rx="4" fill="hsl(90,40%,50%)" opacity="0.7"/>
				<rect x="250" y="100" width="200" height="300" rx="4" fill="hsl(210,40%,50%)" opacity="0.7"/>
				<circle cx="150" cy="140" r="60" fill="hsl(50,50%,60%)" opacity="0.7"/>
			`
			}
		</g>
		<text x="256" y="480" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-family="sans-serif" font-size="14">${mode} · ${strength}% · ${steps} steps</text>
	</svg>`
	return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export class ControlNetNodeDefinition extends NodeDefinition<ControlNetNode> {
	static type = 'controlnet'
	static validator = ControlNetNode
	title = 'ControlNet'
	heading = 'ControlNet'
	icon = (<ControlNetIcon />)
	category = 'process'
	getDefault(): ControlNetNode {
		return {
			type: 'controlnet',
			mode: 'canny',
			strength: 75,
			steps: 20,
			lastResultUrl: null,
		}
	}
	getBodyHeightPx() {
		// model input + image input + prompt input + mode row + strength row + steps row + preview
		return NODE_ROW_HEIGHT_PX * 6 + NODE_IMAGE_PREVIEW_HEIGHT_PX
	}
	getPorts(): Record<string, ShapePort> {
		const baseY = NODE_HEADER_HEIGHT_PX + NODE_ROW_HEADER_GAP_PX
		return {
			model: {
				id: 'model',
				x: 0,
				y: baseY + NODE_ROW_HEIGHT_PX * 0.5,
				terminal: 'end',
				dataType: 'model',
			},
			image: {
				id: 'image',
				x: 0,
				y: baseY + NODE_ROW_HEIGHT_PX * 1.5,
				terminal: 'end',
				dataType: 'image',
			},
			prompt: {
				id: 'prompt',
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
		node: ControlNetNode,
		_inputs: InputValues
	): Promise<ExecutionResult> {
		await sleep(2000)
		const result = simulateControlNet(node.mode, node.strength, node.steps)
		updateNode<ControlNetNode>(this.editor, shape, (n) => ({
			...n,
			lastResultUrl: result,
		}))
		return { output: result }
	}
	getOutputInfo(shape: NodeShape, node: ControlNetNode, inputs: InfoValues): InfoValues {
		return {
			output: {
				value: node.lastResultUrl,
				isOutOfDate: areAnyInputsOutOfDate(inputs) || shape.props.isOutOfDate,
				dataType: 'image',
			},
		}
	}
	Component = ControlNetNodeComponent
}

function ControlNetNodeComponent({ shape, node }: NodeComponentProps<ControlNetNode>) {
	const editor = useEditor()

	const modelInput = useValue('model input', () => getNodeInputPortValues(editor, shape.id).model, [
		editor,
		shape.id,
	])
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
				<Port shapeId={shape.id} portId="model" />
				<NodePortLabel dataType="model">Model</NodePortLabel>
				{modelInput ? (
					<span className="NodeRow-connected-value">
						{modelInput.isOutOfDate || modelInput.value === STOP_EXECUTION ? (
							<NodePlaceholder />
						) : (
							String(modelInput.value)
						)}
					</span>
				) : (
					<span className="NodeRow-disconnected">not connected</span>
				)}
			</NodeRow>
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
			<NodeRow>
				<span className="NodeInputRow-label">Mode</span>
				<select
					value={node.mode}
					onChange={(e) =>
						updateNode<ControlNetNode>(editor, shape, (n) => ({
							...n,
							mode: e.target.value,
						}))
					}
				>
					{CONTROL_MODES.map((m) => (
						<option key={m.id} value={m.id}>
							{m.label}
						</option>
					))}
				</select>
			</NodeRow>
			<NodeRow className="NodeInputRow">
				<span className="NodeInputRow-label">Strength</span>
				<input
					type="range"
					min="0"
					max="100"
					value={node.strength}
					onChange={(e) =>
						updateNode<ControlNetNode>(
							editor,
							shape,
							(n) => ({ ...n, strength: Number(e.target.value) }),
							false
						)
					}
					onPointerDown={(e) => e.stopPropagation()}
				/>
				<span className="NodeRow-value">{node.strength}%</span>
			</NodeRow>
			<NodeRow className="NodeInputRow">
				<span className="NodeInputRow-label">Steps</span>
				<input
					type="range"
					min="1"
					max="50"
					value={node.steps}
					onChange={(e) =>
						updateNode<ControlNetNode>(
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
			<div className="NodeImagePreview">
				{node.lastResultUrl ? (
					<img src={node.lastResultUrl} alt="ControlNet result" />
				) : (
					<div className="NodeImagePreview-empty">
						<span>Connect model + reference image</span>
					</div>
				)}
			</div>
		</>
	)
}
