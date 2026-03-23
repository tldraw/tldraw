import type {
	TLArrowShapeArrowheadStyle,
	TLDefaultColorStyle,
	TLDefaultDashStyle,
	TLDefaultFillStyle,
	TLDefaultHorizontalAlignStyle,
	TLDefaultSizeStyle,
	TLDefaultVerticalAlignStyle,
	TLGeoShapeGeoStyle,
} from 'tldraw'

/**
 * Which Mermaid diagram family produced this blueprint (used by default geo tables and mapper dispatch).
 * @public
 */
export type MermaidDiagramKind = 'flowchart' | 'state' | 'sequence' | 'mindmap'

/**
 * Optional hook: return a custom render spec for this node, or `undefined` to use the package default mapper.
 * @public
 */
export type MermaidNodeRenderMapper = (input: {
	/** Blueprint node id (stable binding key). */
	nodeId: string
	/** Semantic kind for this node in its diagram family. */
	kind: string
}) => MermaidBlueprintNodeRenderSpec | undefined

/**
 * Instructions for creating one blueprint node on the canvas.
 * Set while building the blueprint; {@link renderBlueprint} consumes this without recomputing Mermaid → tldraw mapping.
 * @public
 */
export type MermaidBlueprintNodeRenderSpec =
	| {
			/** Use tldraw’s built-in geo shape; `geo` selects the variant (rectangle, diamond, …). */
			variant: 'geo'
			geo: TLGeoShapeGeoStyle
	  }
	| {
			/** Use any shape type registered on the editor (including custom ShapeUtils). */
			variant: 'shape'
			/** Must match `editor.createShape({ type })` — same string as in the app’s shape schema. */
			type: string
			/** Partial props merged with layout-derived props (size, colors, label text, …) in {@link renderBlueprint}. */
			props: Record<string, unknown>
	  }

/**
 * Intermediate representation of a parsed Mermaid diagram: nodes, edges, optional lifelines and groups.
 * Produced by diagram-specific `*ToBlueprint` functions and consumed by {@link renderBlueprint}.
 * @public
 */
export interface DiagramMermaidBlueprint {
	diagramKind: MermaidDiagramKind
	nodes: MermaidBlueprintNode[]
	edges: MermaidBlueprintEdge[]
	lines?: MermaidBlueprintLineNode[]
	groups?: string[][]
}

/**
 * One node in the blueprint: layout, semantic kind, style fields, and how to materialize it on the canvas.
 * @public
 */
export interface MermaidBlueprintNode {
	id: string
	x: number
	y: number
	w: number
	h: number
	/**
	 * Stable semantic key from Mermaid (flowchart vertex type, `subgraph`, state kind, actor type,
	 * internal sequence kinds such as `sequence_note`, mindmap type as decimal string, …).
	 */
	kind: string
	parentId?: string
	label?: string
	fill?: TLDefaultFillStyle
	color?: TLDefaultColorStyle
	dash?: TLDefaultDashStyle
	size?: TLDefaultSizeStyle
	align?: TLDefaultHorizontalAlignStyle
	verticalAlign?: TLDefaultVerticalAlignStyle
	/** Filled when the blueprint is built; read at render time. */
	render: MermaidBlueprintNodeRenderSpec
}

/** @public */
export interface MermaidBlueprintEdge {
	startNodeId: string
	endNodeId: string
	label?: string
	bend: number
	arrowheadEnd?: TLArrowShapeArrowheadStyle
	arrowheadStart?: TLArrowShapeArrowheadStyle
	dash?: TLDefaultDashStyle
	size?: TLDefaultSizeStyle
	color?: TLDefaultColorStyle
	anchorStartY?: number
	anchorEndY?: number
	isExact?: boolean
	isPrecise?: boolean
	isExactEnd?: boolean
	isPreciseEnd?: boolean
	decoration?: { type: 'autonumber'; value: string }
}

/** @public */
export interface MermaidBlueprintLineNode {
	id: string
	x: number
	y: number
	endX?: number
	endY: number
	dash?: TLDefaultDashStyle
	size?: TLDefaultSizeStyle
	color?: TLDefaultColorStyle
}
