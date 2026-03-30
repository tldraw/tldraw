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
 * Invoked from {@link renderBlueprint}.
 * @public
 */
export type MermaidNodeRenderMapper = (input: {
	/** Same as {@link DiagramMermaidBlueprint.diagramKind} for this blueprint. */
	diagramKind: MermaidDiagramKind
	/** Blueprint node id (stable binding key). */
	nodeId: string
	/** Semantic kind for this node in its diagram family. */
	kind: string
	/** Layout and style fields for this node (no materialization spec — that is what you return). */
	node: MermaidBlueprintNode
}) => MermaidBlueprintNodeRenderSpec | undefined

/**
 * Instructions for creating one blueprint node on the canvas: geo variant or custom shape type + props.
 * Merged with layout-derived props in {@link defaultCreateMermaidNodeFromBlueprint}.
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
			/** Partial props merged with layout-derived props (size, colors, label text, …) in {@link defaultCreateMermaidNodeFromBlueprint}. */
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
 * One node in the blueprint: layout and semantic kind from Mermaid (materialization is resolved at {@link renderBlueprint} via `mapNodeToRenderSpec` or defaults).
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
