import { T, useEditor } from 'tldraw'
import { ModelIcon } from '../../components/icons/ModelIcon'
import { NODE_HEADER_HEIGHT_PX, NODE_ROW_HEIGHT_PX, NODE_WIDTH_PX } from '../../constants'
import { ShapePort } from '../../ports/Port'
import { sleep } from '../../utils/sleep'
import { NodeShape } from '../NodeShapeUtil'
import {
	ExecutionResult,
	InfoValues,
	NodeComponentProps,
	NodeDefinition,
	NodeRow,
	updateNode,
} from './shared'

const MODELS = [
	{ id: 'sd-1.5', label: 'Stable Diffusion 1.5' },
	{ id: 'sdxl', label: 'Stable Diffusion XL' },
	{ id: 'sd-3', label: 'Stable Diffusion 3' },
	{ id: 'flux-dev', label: 'Flux Dev' },
	{ id: 'flux-schnell', label: 'Flux Schnell' },
] as const

export type ModelNode = T.TypeOf<typeof ModelNode>
export const ModelNode = T.object({
	type: T.literal('model'),
	modelId: T.string,
})

export class ModelNodeDefinition extends NodeDefinition<ModelNode> {
	static type = 'model'
	static validator = ModelNode
	title = 'Load model'
	heading = 'Model'
	icon = (<ModelIcon />)
	category = 'input'
	getDefault(): ModelNode {
		return {
			type: 'model',
			modelId: 'sdxl',
		}
	}
	getBodyHeightPx() {
		return NODE_ROW_HEIGHT_PX
	}
	getPorts(): Record<string, ShapePort> {
		return {
			output: {
				id: 'output',
				x: NODE_WIDTH_PX,
				y: NODE_HEADER_HEIGHT_PX / 2,
				terminal: 'start',
				dataType: 'model',
			},
		}
	}
	async execute(_shape: NodeShape, node: ModelNode): Promise<ExecutionResult> {
		await sleep(500)
		return { output: node.modelId }
	}
	getOutputInfo(shape: NodeShape, node: ModelNode): InfoValues {
		return {
			output: {
				value: node.modelId,
				isOutOfDate: shape.props.isOutOfDate,
				dataType: 'model',
			},
		}
	}
	Component = ModelNodeComponent
}

function ModelNodeComponent({ shape, node }: NodeComponentProps<ModelNode>) {
	const editor = useEditor()
	return (
		<NodeRow>
			<select
				value={node.modelId}
				onChange={(e) =>
					updateNode<ModelNode>(editor, shape, (n) => ({
						...n,
						modelId: e.target.value,
					}))
				}
			>
				{MODELS.map((m) => (
					<option key={m.id} value={m.id}>
						{m.label}
					</option>
				))}
			</select>
		</NodeRow>
	)
}
