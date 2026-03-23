import type { TLGeoShapeGeoStyle } from 'tldraw'
import type {
	MermaidBlueprintNodeRenderSpec,
	MermaidDiagramKind,
	MermaidNodeRenderMapper,
} from './blueprint'

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
		case 'subgraph':
		case 'square':
		case 'rect':
		case 'round':
		case 'subroutine':
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
		case 'compound':
		case 'note':
		case 'fork':
		case 'join':
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
		case 'sequence_activation':
		case 'sequence_fragment':
		case 'sequence_fragment_section':
		case 'sequence_note':
		default:
			return 'rectangle'
	}
}

function mindmapKindToGeo(kind: string): TLGeoShapeGeoStyle {
	const type = Number(kind)
	switch (type) {
		case 3:
			return 'ellipse'
		case 4:
			return 'cloud'
		case 6:
			return 'hexagon'
		case 5:
			return 'star'
		case 2:
		case 1:
		case 0:
		default:
			return 'rectangle'
	}
}

/**
 * Default built-in mapping from {@link MermaidDiagramKind} + semantic `kind` to a geo {@link MermaidBlueprintNodeRenderSpec}.
 * Used when the user does not supply `mapNodeToRenderSpec` for that diagram, or when the mapper returns `undefined`.
 * @public
 */
export function defaultMermaidNodeRenderSpec(
	diagramKind: MermaidDiagramKind,
	kind: string
): MermaidBlueprintNodeRenderSpec {
	let geo: TLGeoShapeGeoStyle
	switch (diagramKind) {
		case 'flowchart':
			geo = flowchartKindToGeo(kind)
			break
		case 'state':
			geo = stateKindToGeo(kind)
			break
		case 'sequence':
			geo = sequenceKindToGeo(kind)
			break
		case 'mindmap':
			geo = mindmapKindToGeo(kind)
			break
		default:
			geo = 'rectangle'
	}
	return { variant: 'geo', geo }
}

/**
 * Uses the optional per-diagram mapper when it returns a value; otherwise {@link defaultMermaidNodeRenderSpec}.
 * @public
 */
export function resolveMermaidNodeRender(
	diagramKind: MermaidDiagramKind,
	nodeId: string,
	kind: string,
	mapper?: MermaidNodeRenderMapper | undefined
): MermaidBlueprintNodeRenderSpec {
	return mapper?.({ nodeId, kind }) ?? defaultMermaidNodeRenderSpec(diagramKind, kind)
}
