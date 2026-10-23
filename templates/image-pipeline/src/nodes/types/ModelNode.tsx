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
	NodeSelectRow,
	updateNode,
} from './shared'

interface ModelInfo {
	id: string
	label: string
}

const PROVIDERS: Record<string, { label: string; models: ModelInfo[] }> = {
	flux: {
		label: 'Flux',
		models: [
			{ id: 'flux-dev', label: 'Flux Dev' },
			{ id: 'flux-schnell', label: 'Flux Schnell' },
			{ id: 'flux-pro', label: 'Flux Pro' },
		],
	},
	google: {
		label: 'Google',
		models: [
			{ id: 'nano-banana-pro', label: 'Nano Banana Pro' },
			{ id: 'nano-banana', label: 'Nano Banana' },
			{ id: 'imagen-4-fast', label: 'Imagen 4 Fast' },
		],
	},
}

const PROVIDER_OPTIONS = Object.entries(PROVIDERS).map(([id, p]) => ({ id, label: p.label }))

export type ModelNode = T.TypeOf<typeof ModelNode>
export const ModelNode = T.object({
	type: T.literal('model'),
	provider: T.string,
	modelId: T.string,
})

export class ModelNodeDefinition extends NodeDefinition<ModelNode> {
	static type = 'model'
	static validator = ModelNode
	title = 'Load model'
	heading = 'Model'
	icon = <ModelIcon />
	category = 'input'
	getDefault(): ModelNode {
		return {
			type: 'model',
			provider: 'flux',
			modelId: 'flux-dev',
		}
	}
	getBodyHeightPx() {
		return NODE_ROW_HEIGHT_PX * 2
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
		return { output: `${node.provider}:${node.modelId}` }
	}
	getOutputInfo(shape: NodeShape, node: ModelNode): InfoValues {
		return {
			output: {
				value: `${node.provider}:${node.modelId}`,
				isOutOfDate: shape.props.isOutOfDate,
				dataType: 'model',
			},
		}
	}
	Component = ModelNodeComponent
}

function ModelNodeComponent({ shape, node }: NodeComponentProps<ModelNode>) {
	const editor = useEditor()
	const provider = PROVIDERS[node.provider] ?? PROVIDERS.flux

	return (
		<>
			<NodeSelectRow
				label="Provider"
				value={node.provider}
				options={PROVIDER_OPTIONS}
				onChange={(provider) =>
					updateNode<ModelNode>(editor, shape, (n) => ({
						...n,
						provider,
						modelId: PROVIDERS[provider]?.models[0]?.id ?? '',
					}))
				}
			/>
			<NodeSelectRow
				label="Model"
				value={node.modelId}
				options={provider.models}
				onChange={(modelId) => updateNode<ModelNode>(editor, shape, (n) => ({ ...n, modelId }))}
			/>
		</>
	)
}
