import type { MindmapNode } from 'mermaid/dist/diagrams/mindmap/mindmapTypes.js'
import type { TLDefaultColorStyle, TLDefaultSizeStyle, TLGeoShapeGeoStyle } from 'tldraw'
import type {
	DiagramMermaidBlueprint,
	MermaidBlueprintEdge,
	MermaidBlueprintGeoNode,
} from './blueprint'
import { parseSvgFillColors } from './colors'
import type { ParsedNode } from './svgParsing'
import { parseNodesFromSvg, scaleLayout } from './svgParsing'
import { LAYOUT_SCALE } from './utils'

const MINDMAP_NODE_TYPE = {
	DEFAULT: 0,
	ROUNDED_RECT: 1,
	RECT: 2,
	CIRCLE: 3,
	CLOUD: 4,
	BANG: 5,
	HEXAGON: 6,
} as const

function mapMindmapTypeToGeo(type: number): TLGeoShapeGeoStyle {
	switch (type) {
		case MINDMAP_NODE_TYPE.CIRCLE:
			return 'ellipse'
		case MINDMAP_NODE_TYPE.CLOUD:
			return 'cloud'
		case MINDMAP_NODE_TYPE.HEXAGON:
			return 'hexagon'
		case MINDMAP_NODE_TYPE.BANG:
			return 'star'
		case MINDMAP_NODE_TYPE.RECT:
		case MINDMAP_NODE_TYPE.ROUNDED_RECT:
		case MINDMAP_NODE_TYPE.DEFAULT:
		default:
			return 'rectangle'
	}
}

function getEdgeSizeForLevel(parentLevel: number): TLDefaultSizeStyle {
	if (parentLevel <= 0) return 'l'
	if (parentLevel === 1) return 'm'
	return 's'
}

interface FlatNode {
	id: string
	label: string
	type: number
	level: number
	parentId: string | undefined
	isRoot: boolean
}

function flattenMindmapTree(
	node: MindmapNode,
	parentId: string | undefined,
	out: FlatNode[]
): void {
	out.push({
		id: String(node.id),
		label: node.descr,
		type: node.type,
		level: node.level,
		parentId,
		isRoot: !!node.isRoot,
	})
	for (const child of node.children) {
		flattenMindmapTree(child, String(node.id), out)
	}
}

/**
 * Pre-parsed SVG layout for mindmap diagram converters.
 * Contains already-scaled node positions and per-node fill colors extracted from the SVG.
 */
export interface ParsedMindmapLayout {
	nodes: Map<string, ParsedNode>
	nodeColors: Map<string, TLDefaultColorStyle>
}

function parseMindmapNodeId(domId: string): string {
	const match = domId.match(/^node_(\d+)$/)
	return match ? match[1] : domId
}

/** Parse mindmap-specific SVG layout data for use by {@link mindmapToBlueprint}. */
export function parseMindmapLayout(root: Element): ParsedMindmapLayout {
	const nodes = parseNodesFromSvg(root, '.node', parseMindmapNodeId)

	const nodeColors = parseSvgFillColors(root, '.node', parseMindmapNodeId)

	scaleLayout(nodes, new Map(), [], LAYOUT_SCALE)

	return { nodes, nodeColors }
}

/** Convert a parsed Mermaid mindmap into a tldraw blueprint of nodes and edges. */
export function mindmapToBlueprint(
	layout: ParsedMindmapLayout,
	mindmapTree: MindmapNode
): DiagramMermaidBlueprint {
	const flatNodes: FlatNode[] = []
	flattenMindmapTree(mindmapTree, undefined, flatNodes)

	const { nodes: svgNodes, nodeColors } = layout

	const nodes: MermaidBlueprintGeoNode[] = []
	const edges: MermaidBlueprintEdge[] = []
	const levelById = new Map(flatNodes.map((n) => [n.id, n.level]))

	for (const flatNode of flatNodes) {
		const svgNode = svgNodes.get(flatNode.id)
		if (!svgNode) continue

		const geo = mapMindmapTypeToGeo(flatNode.type)
		const color = nodeColors.get(flatNode.id) ?? 'black'

		let { width: w, height: h } = svgNode
		if (flatNode.type === MINDMAP_NODE_TYPE.CIRCLE) {
			w = h = Math.max(w, h)
		}

		nodes.push({
			id: flatNode.id,
			x: svgNode.center.x - w / 2,
			y: svgNode.center.y - h / 2,
			w,
			h,
			geo,
			label: flatNode.label || undefined,
			fill: 'solid',
			color,
			size: flatNode.isRoot ? 'l' : 'm',
			align: 'middle',
			verticalAlign: 'middle',
		})

		// Edge from parent to this node
		if (flatNode.parentId) {
			const parentLevel = levelById.get(flatNode.parentId) ?? 0
			edges.push({
				startNodeId: flatNode.parentId,
				endNodeId: flatNode.id,
				bend: 0,
				arrowheadEnd: 'none',
				arrowheadStart: 'none',
				size: getEdgeSizeForLevel(parentLevel),
				color,
			})
		}
	}

	const nodeIds = new Set(nodes.map((n) => n.id))
	const validEdges = edges.filter((e) => nodeIds.has(e.startNodeId) && nodeIds.has(e.endNodeId))
	return { nodes, edges: validEdges }
}
