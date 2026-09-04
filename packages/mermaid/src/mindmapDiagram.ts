import type { MindmapNode } from 'mermaid/dist/diagrams/mindmap/mindmapTypes.js'
import type { TLDefaultColorStyle, TLDefaultSizeStyle } from 'tldraw'
import type {
	DiagramMermaidBlueprint,
	MermaidBlueprintEdge,
	MermaidBlueprintNode,
} from './blueprint'
import { parseRgbToTldrawColor } from './colors'
import { parseDomId, parseNodesFromSvg, scaleLayout } from './svgParsing'
import type { ParsedNode } from './svgParsing'
import { dropDanglingEdges, LAYOUT_SCALE } from './utils'

/** Mermaid mindmap node `type` integers (`kind` on blueprint nodes is `String(type)`). @public */
export const MERMAID_MINDMAP_NODE_TYPE = {
	DEFAULT: 0,
	ROUNDED_RECT: 1,
	RECT: 2,
	CIRCLE: 3,
	CLOUD: 4,
	BANG: 5,
	HEXAGON: 6,
} as const

function getEdgeSizeForLevel(parentLevel: number): TLDefaultSizeStyle {
	if (parentLevel <= 0) return 'l'
	if (parentLevel === 1) return 'm'
	return 's'
}

/**
 * Pre-parsed SVG layout for mindmap diagram converters.
 * Contains already-scaled node positions extracted from the SVG.
 */
export interface ParsedMindmapLayout {
	nodes: Map<string, ParsedNode>
}

const NODE_ID = /^node_(\d+)$/

const parseNodeId = (domId: string) => parseDomId(domId, NODE_ID)

/** Parse mindmap-specific SVG layout data for use by {@link mindmapToBlueprint}. */
export function parseMindmapLayout(root: Element): ParsedMindmapLayout {
	const nodes = parseNodesFromSvg(root, '.node', parseNodeId)
	scaleLayout(nodes, new Map(), [], LAYOUT_SCALE)
	return { nodes }
}

/** Convert a parsed Mermaid mindmap into a tldraw blueprint of nodes and edges. */
export function mindmapToBlueprint(
	layout: ParsedMindmapLayout,
	mindmapTree: MindmapNode,
	svgRoot: Element
): DiagramMermaidBlueprint {
	const nodeColors = new Map<string, TLDefaultColorStyle>()
	for (const el of svgRoot.querySelectorAll('.node')) {
		const shape =
			el.querySelector('rect, circle, ellipse, polygon, path') ??
			el.querySelector('.label-container')
		if (!shape) continue
		const parsed = parseRgbToTldrawColor(getComputedStyle(shape).fill)
		if (parsed) nodeColors.set(parseNodeId(el.getAttribute('id') || ''), parsed.color)
	}

	const nodes: MermaidBlueprintNode[] = []
	const edges: MermaidBlueprintEdge[] = []

	function visit(node: MindmapNode, parent: MindmapNode | undefined) {
		const id = String(node.id)
		const svgNode = layout.nodes.get(id)
		if (svgNode) {
			const color = nodeColors.get(id) ?? 'black'

			let { width: w, height: h } = svgNode
			if (node.type === MERMAID_MINDMAP_NODE_TYPE.CIRCLE) {
				w = h = Math.max(w, h)
			}

			nodes.push({
				id,
				kind: String(node.type),
				x: svgNode.center.x - w / 2,
				y: svgNode.center.y - h / 2,
				w,
				h,
				label: node.descr || undefined,
				fill: 'solid',
				color,
				size: node.isRoot ? 'l' : 'm',
				align: 'middle',
				verticalAlign: 'middle',
			})

			// Edge from parent to this node
			if (parent) {
				edges.push({
					startNodeId: String(parent.id),
					endNodeId: id,
					bend: 0,
					arrowheadEnd: 'none',
					arrowheadStart: 'none',
					size: getEdgeSizeForLevel(parent.level),
					color,
				})
			}
		}
		for (const child of node.children) visit(child, node)
	}
	visit(mindmapTree, undefined)

	return { diagramKind: 'mindmap', nodes, edges: dropDanglingEdges(nodes, edges) }
}
