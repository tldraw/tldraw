import { registerTldrawLibraryVersion } from '@tldraw/utils'

export type {
	DiagramMermaidBlueprint,
	MermaidBlueprintEdge,
	MermaidBlueprintLineNode,
	MermaidBlueprintNode,
	MermaidBlueprintNodeRenderSpec,
	MermaidDiagramKind,
	MermaidNodeRenderMapper,
} from './blueprint'
export {
	getMermaidClassShapeSize,
	MERMAID_CLASS_SHAPE_TYPE,
	MermaidClassShapeUtil,
	type MermaidClassBox,
	type MermaidClassMember,
	type TLMermaidClassShape,
	type TLMermaidClassShapeProps,
} from './classShape'
export {
	MERMAID_MULTIPLICITY_BINDING_TYPE,
	MermaidMultiplicityBindingUtil,
	type TLMermaidMultiplicityBinding,
	type TLMermaidMultiplicityBindingProps,
} from './multiplicityBinding'
export { createMermaidDiagram, MermaidDiagramError } from './createMermaidDiagram'
export type { MermaidDiagramOptions } from './createMermaidDiagram'
export {
	defaultMermaidNodeRenderSpec,
	resolveMermaidNodeRender,
} from './defaultMermaidNodeRenderSpec'
export { MERMAID_MINDMAP_NODE_TYPE } from './mindmapDiagram'
export {
	defaultCreateMermaidNodeFromBlueprint,
	type MermaidNodeCreateFunctionArgs,
} from './mermaidNodeCreateShape'
export { renderBlueprint } from './renderBlueprint'
export type { BlueprintRenderingOptions } from './renderBlueprint'

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
