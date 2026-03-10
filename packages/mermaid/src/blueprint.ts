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

/** @public */
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
}

/** @public */
export interface MermaidBlueprintLineNode {
	id: string
	x: number
	y: number
	endY: number
	dash?: TLDefaultDashStyle
	size?: TLDefaultSizeStyle
	color?: TLDefaultColorStyle
}
