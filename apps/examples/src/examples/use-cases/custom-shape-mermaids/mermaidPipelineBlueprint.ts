import type { MermaidNodeRenderMapper } from '@tldraw/mermaid'
import { CUSTOM_SHAPE_TYPE } from './customMermaidShapeUtil'

/** Filled on each Apply from `parseLinearPipelineFromMermaid` so the mapper can attach 1-based step indices. */
const pipelineCreateContext = {
	stepIndexByNodeId: new Map<string, number>(),
}

/** Call after parsing so `mapNodeToRenderSpec` can inject `pipelineStepIndex` props. */
export function setPipelineStepIndicesFromOrder(order: string[] | null) {
	pipelineCreateContext.stepIndexByNodeId = order?.length
		? new Map(order.map((id, i) => [id, i + 1]))
		: new Map()
}

/** Pass to `createMermaidDiagram` → `blueprintRender.mapNodeToRenderSpec`: custom shape + optional step index from our linear parser. */
export const mapNodeToRenderSpec: MermaidNodeRenderMapper = (input) => {
	if (input.diagramKind !== 'flowchart') return undefined

	const stepIndex = pipelineCreateContext.stepIndexByNodeId.get(input.nodeId)
	return {
		variant: 'shape',
		type: CUSTOM_SHAPE_TYPE,
		props: {
			fill: 'solid',
			color: 'grey',
			mermaidNodeId: input.nodeId,
			...(stepIndex !== undefined ? { pipelineStepIndex: stepIndex } : {}),
		},
	}
}
