import type { MindmapNode } from 'mermaid/dist/diagrams/mindmap/mindmapTypes.js'
import type { TLDefaultColorStyle, TLDefaultSizeStyle, TLGeoShapeGeoStyle } from 'tldraw'
import type {
	DiagramMermaidBlueprint,
	MermaidBlueprintEdge,
	MermaidBlueprintGeoNode,
} from './blueprint'
import { parseRgbToTldrawColor } from './colors'
import { parseNodesFromSvg, scaleLayout } from './svgParsing'
import { LAYOUT_SCALE, sanitizeDiagramText } from './utils'

// Mermaid mindmap node type constants (from MindmapDB.nodeType)
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

// Mermaid's theme colors for mindmap sections (default theme).
// These are the cScale colors from the default mermaid theme that get applied
// to mindmap nodes as section-<n> CSS classes.
const SECTION_COLORS: TLDefaultColorStyle[] = [
	'blue',
	'orange',
	'green',
	'red',
	'violet',
	'grey',
	'blue',
	'orange',
	'green',
	'red',
	'violet',
	'grey',
]

function getSectionColor(section: number | undefined): TLDefaultColorStyle {
	if (section === undefined || section < 0) return 'black'
	return SECTION_COLORS[section % SECTION_COLORS.length]
}

// Mermaid mindmap edges get thinner as depth increases.
// Map to tldraw sizes so root→child edges are thickest.
function getEdgeSizeForLevel(parentLevel: number): TLDefaultSizeStyle {
	if (parentLevel <= 0) return 'l'
	if (parentLevel === 1) return 'm'
	return 's'
}

interface FlatNode {
	id: string
	numericId: number
	label: string
	type: number
	level: number
	parentId: string | undefined
	section: number | undefined
	isRoot: boolean
}

function flattenMindmapTree(
	node: MindmapNode,
	parentId: string | undefined,
	out: FlatNode[]
): void {
	out.push({
		id: String(node.id),
		numericId: node.id,
		label: node.descr,
		type: node.type,
		level: node.level,
		parentId,
		section: node.section,
		isRoot: !!node.isRoot,
	})
	for (const child of node.children) {
		flattenMindmapTree(child, String(node.id), out)
	}
}

/** Convert a parsed Mermaid mindmap into a tldraw blueprint of nodes and edges. */
export function mindmapToBlueprint(
	root: Element,
	mindmapTree: MindmapNode
): DiagramMermaidBlueprint {
	const flatNodes: FlatNode[] = []
	flattenMindmapTree(mindmapTree, undefined, flatNodes)

	// Mermaid mindmap node <g> elements have DOM ids like "node_0", "node_1".
	// The `.node` class selector matches them; the id parser strips the "node_" prefix
	// to get the numeric id that matches our flatNode ids.
	const svgNodes = parseNodesFromSvg(root, '.node', (domId) => {
		const match = domId.match(/^node_(\d+)$/)
		return match ? match[1] : domId
	})

	// Extract fill colors from SVG node background paths
	const nodeColors = new Map<string, TLDefaultColorStyle>()
	for (const groupEl of root.querySelectorAll('.node')) {
		const rawId = groupEl.getAttribute('id') || ''
		const match = rawId.match(/^node_(\d+)$/)
		const id = match ? match[1] : rawId

		// Try to read fill color from the shape element
		const shape =
			groupEl.querySelector('rect, circle, ellipse, polygon, path') ??
			groupEl.querySelector('.label-container')
		if (shape) {
			const fill = shape.getAttribute('fill')
			if (fill) {
				const parsed = parseRgbToTldrawColor(fill)
				if (parsed) nodeColors.set(id, parsed.color)
			}
		}
	}

	const emptyClusters = new Map()
	scaleLayout(svgNodes, emptyClusters, [], LAYOUT_SCALE)

	const nodes: MermaidBlueprintGeoNode[] = []
	const edges: MermaidBlueprintEdge[] = []
	const levelById = new Map(flatNodes.map((n) => [n.id, n.level]))

	for (const flatNode of flatNodes) {
		const svgNode = svgNodes.get(flatNode.id)
		if (!svgNode) continue

		const geo = mapMindmapTypeToGeo(flatNode.type)
		const color =
			nodeColors.get(flatNode.id) ?? getSectionColor(flatNode.section)

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
			label: sanitizeDiagramText(flatNode.label) || undefined,
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
	const validEdges = edges.filter(
		(e) => nodeIds.has(e.startNodeId) && nodeIds.has(e.endNodeId)
	)
	return { nodes, edges: validEdges }
}
