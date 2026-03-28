import type { MermaidNodeRenderMapper } from '@tldraw/mermaid'
import { CUSTOM_SHAPE_TYPE } from './customMermaidShapeUtil'

/** Pass to `createMermaidDiagram` → `blueprintRender.mapNodeToRenderSpec`: custom `flowchart-util` + `mermaidNodeId` (layer badges applied after import via `applyPipelineStepIndices`). */
export const mapNodeToRenderSpec: MermaidNodeRenderMapper = (input) => {
	if (input.diagramKind !== 'flowchart') return undefined

	return {
		variant: 'shape',
		type: CUSTOM_SHAPE_TYPE,
		props: {
			fill: 'solid',
			color: 'grey',
			mermaidNodeId: input.nodeId,
		},
	}
}
