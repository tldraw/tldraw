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
 * An intermediate representation of a parsed mermaid diagram as abstract nodes,
 * edges, and lines with layout positions and tldraw style props. Produced by
 * the diagram-specific converters and consumed by `renderBlueprint` to create
 * actual tldraw shapes on the canvas.
 *
 * @public
 */
export interface DiagramMermaidBlueprint {
	nodes: MermaidBlueprintGeoNode[]
	edges: MermaidBlueprintEdge[]
	lines?: MermaidBlueprintLineNode[]
	groups?: string[][]
}

/** @public */
export interface MermaidBlueprintGeoNode {
	id: string
	x: number
	y: number
	w: number
	h: number
	geo: TLGeoShapeGeoStyle
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
