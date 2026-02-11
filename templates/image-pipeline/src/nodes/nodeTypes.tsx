import { Editor, T, useEditor, WeakCache } from 'tldraw'
import {
	NODE_FOOTER_HEIGHT_PX,
	NODE_HEADER_HEIGHT_PX,
	NODE_ROW_BOTTOM_PADDING_PX,
	NODE_ROW_HEADER_GAP_PX,
} from '../constants'
import { PortId, ShapePort } from '../ports/Port'
import { NodeShape } from './NodeShapeUtil'
import { AdjustNodeDefinition } from './types/AdjustNode'
import { BlendNodeDefinition } from './types/BlendNode'
import { CaptureNodeDefinition } from './types/CaptureNode'
import { ControlNetNodeDefinition } from './types/ControlNetNode'
import { GenerateNodeDefinition } from './types/GenerateNode'
import { GenerateTextNodeDefinition } from './types/GenerateTextNode'
import { IPAdapterNodeDefinition } from './types/IPAdapterNode'
import { IteratorNodeDefinition } from './types/IteratorNode'
import { LoadImageNodeDefinition } from './types/LoadImageNode'
import { ModelNodeDefinition } from './types/ModelNode'
import { NumberNodeDefinition } from './types/NumberNode'
import { PreviewNodeDefinition } from './types/PreviewNode'
import { PromptConcatNodeDefinition } from './types/PromptConcatNode'
import { PromptNodeDefinition } from './types/PromptNode'
import { RouterNodeDefinition } from './types/RouterNode'
import { StyleTransferNodeDefinition } from './types/StyleTransferNode'
import { UpscaleNodeDefinition } from './types/UpscaleNode'
import {
	ExecutionResult,
	InfoValues,
	NodeDefinition,
	NodeDefinitionConstructor,
} from './types/shared'

/** All our node types */
export const NodeDefinitions = {
	model: ModelNodeDefinition,
	prompt: PromptNodeDefinition,
	generate: GenerateNodeDefinition,
	generate_text: GenerateTextNodeDefinition,
	controlnet: ControlNetNodeDefinition,
	load_image: LoadImageNodeDefinition,
	preview: PreviewNodeDefinition,
	blend: BlendNodeDefinition,
	adjust: AdjustNodeDefinition,
	upscale: UpscaleNodeDefinition,
	ip_adapter: IPAdapterNodeDefinition,
	style_transfer: StyleTransferNodeDefinition,
	prompt_concat: PromptConcatNodeDefinition,
	number: NumberNodeDefinition,
	router: RouterNodeDefinition,
	iterator: IteratorNodeDefinition,
	capture: CaptureNodeDefinition,
} satisfies Record<string, NodeDefinitionConstructor<any>>

/**
 * A union type of all our node types.
 */
export type NodeType = T.TypeOf<typeof NodeType>
export const NodeType = T.union(
	'type',
	Object.fromEntries(Object.values(NodeDefinitions).map((type) => [type.type, type.validator])) as {
		[K in keyof typeof NodeDefinitions as (typeof NodeDefinitions)[K]['type']]: (typeof NodeDefinitions)[K]['validator']
	}
)

const nodeDefinitions = new WeakCache<
	Editor,
	{ [K in keyof typeof NodeDefinitions]: InstanceType<(typeof NodeDefinitions)[K]> }
>()
export function getNodeDefinitions(editor: Editor) {
	return nodeDefinitions.get(editor, () => {
		return Object.fromEntries(
			Object.values(NodeDefinitions).map((value) => [value.type, new value(editor)])
		) as any
	})
}

export function getNodeDefinition(
	editor: Editor,
	node: NodeType | NodeType['type']
): NodeDefinition<NodeType> {
	return getNodeDefinitions(editor)[
		typeof node === 'string' ? node : node.type
	] as NodeDefinition<NodeType>
}

export function getNodeWidthPx(editor: Editor, shape: NodeShape): number {
	return getNodeDefinition(editor, shape.props.node).getWidthPx(shape, shape.props.node)
}

export function getNodeBodyHeightPx(editor: Editor, shape: NodeShape): number {
	return getNodeDefinition(editor, shape.props.node).getBodyHeightPx(shape, shape.props.node)
}

export function getNodeHeightPx(editor: Editor, shape: NodeShape): number {
	return (
		NODE_HEADER_HEIGHT_PX +
		NODE_ROW_HEADER_GAP_PX +
		getNodeBodyHeightPx(editor, shape) +
		NODE_ROW_BOTTOM_PADDING_PX +
		NODE_FOOTER_HEIGHT_PX
	)
}

export function getNodeTypePorts(editor: Editor, shape: NodeShape): Record<string, ShapePort> {
	return getNodeDefinition(editor, shape.props.node).getPorts(shape, shape.props.node)
}

export async function executeNode(
	editor: Editor,
	shape: NodeShape,
	inputs: Record<string, string | number | null | (string | number | null)[]>
): Promise<ExecutionResult> {
	return await getNodeDefinition(editor, shape.props.node).execute(shape, shape.props.node, inputs)
}

export function getNodeOutputInfo(
	editor: Editor,
	shape: NodeShape,
	inputs: InfoValues
): InfoValues {
	return getNodeDefinition(editor, shape.props.node).getOutputInfo(shape, shape.props.node, inputs)
}

export function onNodePortConnect(editor: Editor, shape: NodeShape, port: PortId) {
	getNodeDefinition(editor, shape.props.node).onPortConnect?.(shape, shape.props.node, port)
}

export function onNodePortDisconnect(editor: Editor, shape: NodeShape, port: PortId) {
	getNodeDefinition(editor, shape.props.node).onPortDisconnect?.(shape, shape.props.node, port)
}

export function NodeBody({ shape }: { shape: NodeShape }) {
	const editor = useEditor()
	const node = shape.props.node
	const { Component } = getNodeDefinition(editor, node)
	return <Component shape={shape} node={node} />
}
