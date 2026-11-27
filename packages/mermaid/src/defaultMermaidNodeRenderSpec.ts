import type { TLGeoShapeGeoStyle } from 'tldraw'
import type {
	MermaidBlueprintNode,
	MermaidBlueprintNodeRenderSpec,
	MermaidDiagramKind,
	MermaidNodeRenderMapper,
} from './blueprint'
import { MERMAID_MINDMAP_NODE_TYPE } from './mindmapDiagram'

function flowchartKindToGeo(kind: string): TLGeoShapeGeoStyle {
	switch (kind) {
		case 'diamond':
			return 'diamond'
		case 'ellipse':
		case 'circle':
		case 'doublecircle':
		case 'stadium':
		case 'cylinder':
			return 'ellipse'
		case 'hexagon':
			return 'hexagon'
		case 'trapezoid':
		case 'inv_trapezoid':
			return 'trapezoid'
		case 'lean_right':
			return 'rhombus'
		case 'lean_left':
			return 'rhombus-2'
		default:
			return 'rectangle'
	}
}

function stateKindToGeo(kind: string): TLGeoShapeGeoStyle {
	switch (kind) {
		case 'choice':
			return 'diamond'
		case 'start':
		case 'end':
		case 'end_inner':
			return 'ellipse'
		default:
			return 'rectangle'
	}
}

function sequenceKindToGeo(kind: string): TLGeoShapeGeoStyle {
	switch (kind) {
		case 'actor':
			return 'ellipse'
		case 'database':
			return 'oval'
		default:
			return 'rectangle'
	}
}

function mindmapKindToGeo(kind: string): TLGeoShapeGeoStyle {
	switch (Number(kind)) {
		case MERMAID_MINDMAP_NODE_TYPE.CIRCLE:
			return 'ellipse'
		case MERMAID_MINDMAP_NODE_TYPE.CLOUD:
			return 'cloud'
		case MERMAID_MINDMAP_NODE_TYPE.HEXAGON:
			return 'hexagon'
		case MERMAID_MINDMAP_NODE_TYPE.BANG:
			return 'star'
		default:
			return 'rectangle'
	}
}

const KIND_TO_GEO: Record<MermaidDiagramKind, (kind: string) => TLGeoShapeGeoStyle> = {
	flowchart: flowchartKindToGeo,
	state: stateKindToGeo,
	sequence: sequenceKindToGeo,
	mindmap: mindmapKindToGeo,
	class: () => 'rectangle',
}

/**
 * Default built-in mapping from {@link MermaidDiagramKind} + semantic `kind` to a {@link MermaidBlueprintNodeRenderSpec}: a geo shape, or bare text for a mindmap node with no shape, a sequence section title, and a class diagram's lollipop interface.
 * Used when `mapNodeToRenderSpec` is omitted from `renderBlueprint` options, or when the mapper returns `undefined`.
 * @public
 */
export function defaultMermaidNodeRenderSpec(
	diagramKind: MermaidDiagramKind,
	kind: string
): MermaidBlueprintNodeRenderSpec {
	// A mindmap node written without brackets has no shape: the layout draws it as text alone, so a
	// box around it would overlap its tightly stacked siblings. A sequence section's title is text in
	// the layout too, which puts a nested frame or note just below it, inside where a box would end.
	// A lollipop interface is its name, with the circle drawn on its relation's end.
	if (
		(diagramKind === 'mindmap' && Number(kind) === MERMAID_MINDMAP_NODE_TYPE.DEFAULT) ||
		(diagramKind === 'sequence' && kind === 'sequence_fragment_section') ||
		(diagramKind === 'class' && kind === 'interface')
	) {
		return { variant: 'text' }
	}
	return { variant: 'geo', geo: KIND_TO_GEO[diagramKind]?.(kind) ?? 'rectangle' }
}

/**
 * Uses the optional mapper when it returns a value; otherwise {@link defaultMermaidNodeRenderSpec}.
 * @public
 */
export function resolveMermaidNodeRender(
	diagramKind: MermaidDiagramKind,
	node: MermaidBlueprintNode,
	mapper?: MermaidNodeRenderMapper | undefined
): MermaidBlueprintNodeRenderSpec {
	return (
		mapper?.({
			diagramKind,
			nodeId: node.id,
			kind: node.kind,
			node,
		}) ?? defaultMermaidNodeRenderSpec(diagramKind, node.kind)
	)
}
