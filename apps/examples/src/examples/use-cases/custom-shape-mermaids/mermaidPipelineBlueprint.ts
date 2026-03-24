import {
	defaultCreateMermaidNodeFromBlueprint,
	type MermaidNodeCreateFunctionArgs,
	MermaidNodeRenderMapper,
} from '@tldraw/mermaid'
import { CUSTOM_SHAPE_TYPE } from './customMermaidShapeUtil'

/** Filled on each Apply from `parseLinearPipelineFromMermaid` so `createShape` can enrich nodes. */
const pipelineCreateContext = {
	stepIndexByNodeId: new Map<string, number>(),
}

/** Call after parsing so `createPipelineNodeFromBlueprint` can attach 1-based step indices. */
export function setPipelineStepIndicesFromOrder(order: string[] | null) {
	pipelineCreateContext.stepIndexByNodeId = order?.length
		? new Map(order.map((id, i) => [id, i + 1]))
		: new Map()
}

export const mapNodeToRenderSpec: MermaidNodeRenderMapper = (input) => ({
	variant: 'shape',
	type: 'flowchart-util',
	props: {
		fill: 'solid',
		color: 'grey',
		mermaidNodeId: input.nodeId,
	},
})

export function createPipelineNodeFromBlueprint(args: MermaidNodeCreateFunctionArgs) {
	const shape = defaultCreateMermaidNodeFromBlueprint(args)
	const stepIndex = pipelineCreateContext.stepIndexByNodeId.get(args.node.id)
	if (stepIndex === undefined || shape.type !== CUSTOM_SHAPE_TYPE) {
		return shape
	}
	args.editor.updateShape({
		id: args.shapeId,
		type: CUSTOM_SHAPE_TYPE,
		props: {
			...shape.props,
			pipelineStepIndex: stepIndex,
		},
	})
	return args.editor.getShape(args.shapeId)!
}
