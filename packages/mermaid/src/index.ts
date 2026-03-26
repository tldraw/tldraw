import { registerTldrawLibraryVersion } from '@tldraw/utils'

export type {
	DiagramMermaidBlueprint,
	MermaidBlueprintEdge,
	MermaidBlueprintGeoNode,
	MermaidBlueprintLineNode,
} from './blueprint'
export { createMermaidDiagram, MermaidDiagramError } from './createMermaidDiagram'
export type { MermaidDiagramOptions } from './createMermaidDiagram'
export { renderBlueprint } from './renderBlueprint'
export type { BlueprintRenderingOptions } from './renderBlueprint'

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
