import type {
	FlowClass,
	FlowEdge,
	FlowSubGraph,
	FlowVertex,
} from 'mermaid/dist/diagrams/flowchart/types.js'
import { TLArrowShapeArrowheadStyle, TLDefaultDashStyle, TLGeoShape } from 'tldraw'
import type {
	DiagramMermaidBlueprint,
	MermaidBlueprintEdge,
	MermaidBlueprintGeoNode,
} from './blueprint'
import { buildClassDefColorMap, parseCssStyles, parseNodeInlineColor } from './colors'
import {
	buildNodeCentersFromSvg,
	parseAllEdgePointsFromSvg,
	parseClustersFromSvg,
	parseNodesFromSvg,
	scaleLayout,
} from './svgParsing'
import { getArrowBend, LAYOUT_SCALE, orderTopDown } from './utils'

function mapEdgeTypeToArrowhead(type: string | undefined): TLArrowShapeArrowheadStyle {
	if (!type) return 'arrow'

	if (type.includes('point')) return 'arrow'
	if (type.includes('circle')) return 'dot'
	if (type.includes('cross')) return 'bar'
	if (type.includes('open')) return 'none'

	return 'arrow'
}

function mapFlowShapeTypeToGeo(type: string | undefined): TLGeoShape['props']['geo'] {
	switch (type) {
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
		// TODO: implement inv_trapezoid in SDK
		case 'inv_trapezoid':
			return 'trapezoid'
		case 'lean_right':
			return 'rhombus'
		case 'lean_left':
			return 'rhombus-2'
		case 'square':
		case 'rect':
		case 'round':
		case 'subroutine':
		default:
			return 'rectangle'
	}
}

function mapEdgeStrokeToDash(stroke: string | undefined): TLDefaultDashStyle {
	if (!stroke) return 'solid'
	if (stroke === 'dotted') return 'dotted'
	return 'solid'
}

const FRAME_TOP_PAD = 14

function buildHierarchy(subGraphs: FlowSubGraph[]) {
	const subGraphIds = new Set(subGraphs.map((subGraph) => subGraph.id))
	const nodeToSubGraph = new Map<string, string>()
	const subGraphParent = new Map<string, string>()
	for (const subGraph of subGraphs) {
		for (const nodeId of subGraph.nodes) {
			if (subGraphIds.has(nodeId)) {
				subGraphParent.set(nodeId, subGraph.id)
			} else if (!nodeToSubGraph.has(nodeId)) {
				nodeToSubGraph.set(nodeId, subGraph.id)
			}
		}
	}
	return { nodeToSubGraph, subGraphParent }
}

/** Convert a parsed Mermaid flowchart into a tldraw blueprint of nodes and edges. */
export function flowchartToBlueprint(
	root: Element,
	vertices: Map<string, FlowVertex>,
	edges: FlowEdge[],
	subGraphs?: FlowSubGraph[],
	classDefs?: Map<string, FlowClass>
): DiagramMermaidBlueprint {
	const nodeColorMap = classDefs ? buildClassDefColorMap(classDefs, vertices) : new Map()
	// Mermaid assigns flowchart node DOM ids like "flowchart-myNode-42".
	// Group 1 = the original node id from the diagram source.
	const svgNodes = parseNodesFromSvg(root, '.node', (domId) => {
		const match = domId.match(/^flowchart-(.+)-\d+$/)
		return match ? match[1] : domId
	})
	const svgClusters = parseClustersFromSvg(root, '.cluster')
	// Mermaid edge data-id attributes look like "L_startId_endId_0".
	// Group 1 = start node id, group 2 = end node id (using [^_]+ so it
	// stops at the trailing _digit suffix).
	const svgEdges = parseAllEdgePointsFromSvg(root, (dataId) => {
		const match = dataId.match(/^L_(.+)_([^_]+)_\d+$/)
		return match ? { start: match[1], end: match[2] } : null
	})

	scaleLayout(svgNodes, svgClusters, svgEdges, LAYOUT_SCALE)
	const nodeCenters = buildNodeCentersFromSvg(svgNodes, svgClusters)

	const allSubGraphs = subGraphs || []
	const { nodeToSubGraph, subGraphParent } = buildHierarchy(allSubGraphs)

	const nodes: MermaidBlueprintGeoNode[] = []
	const blueprintEdges: MermaidBlueprintEdge[] = []

	// Frames for subgraphs
	for (const subGraph of orderTopDown(
		allSubGraphs,
		(subGraph) => subGraph.id,
		(subGraph) => subGraphParent.get(subGraph.id)
	)) {
		const cluster = svgClusters.get(subGraph.id)
		if (!cluster) continue

		nodes.push({
			id: subGraph.id,
			x: cluster.topLeft.x,
			y: cluster.topLeft.y - FRAME_TOP_PAD,
			w: cluster.width,
			h: cluster.height + FRAME_TOP_PAD,
			geo: 'rectangle',
			parentId: subGraphParent.get(subGraph.id),
			label: subGraph.title || subGraph.id,
			fill: 'semi',
			color: 'black',
			dash: 'draw',
			size: 's',
			align: 'middle',
			verticalAlign: 'start',
		})
	}

	// Node shapes
	for (const [id, vertex] of vertices) {
		const svgNode = svgNodes.get(id)
		if (!svgNode) continue

		const geo = mapFlowShapeTypeToGeo(vertex.type)
		const colors = nodeColorMap.get(id) ?? parseNodeInlineColor(vertex.styles)

		let { width: w, height: h } = svgNode
		if (vertex.type === 'circle' || vertex.type === 'doublecircle') {
			w = h = Math.max(w, h)
		}

		nodes.push({
			id,
			x: svgNode.center.x - w / 2,
			y: svgNode.center.y - h / 2,
			w,
			h,
			geo,
			parentId: nodeToSubGraph.get(id),
			label: vertex.text || undefined,
			...(colors?.fillColor && { fill: 'solid' as const }),
			...(colors && { color: colors.strokeColor ?? colors.fillColor }),
			align: 'middle',
			verticalAlign: 'middle',
			size: 'm',
		} satisfies MermaidBlueprintGeoNode)
	}

	// Edges: match DB edges to SVG edges by proximity, compute bends
	const claimed = new Set<number>()
	for (const edge of edges) {
		const startCenter = nodeCenters.get(edge.start)
		const endCenter = nodeCenters.get(edge.end)

		let bend = 0
		if (startCenter && endCenter) {
			let bestIndex = -1
			let bestDist = Infinity
			for (let i = 0; i < svgEdges.length; i++) {
				if (claimed.has(i) || svgEdges[i].points.length < 2) continue

				const points = svgEdges[i].points
				const distance =
					Math.hypot(points[0].x - startCenter.x, points[0].y - startCenter.y) +
					Math.hypot(
						points[points.length - 1].x - endCenter.x,
						points[points.length - 1].y - endCenter.y
					)
				if (distance < bestDist) {
					bestDist = distance
					bestIndex = i
				}
			}
			if (bestIndex >= 0) {
				claimed.add(bestIndex)
				bend = getArrowBend(svgEdges[bestIndex])
			}
		}

		const cssOverrides = edge.style ? parseCssStyles(edge.style) : undefined
		const arrowheadEnd = mapEdgeTypeToArrowhead(edge.type)
		const dash = cssOverrides?.dashOverride ?? mapEdgeStrokeToDash(edge.stroke)
		const size = cssOverrides?.sizeOverride ?? (edge.stroke === 'thick' ? 'l' : 's')

		blueprintEdges.push({
			startNodeId: edge.start,
			endNodeId: edge.end,
			label: edge.text,
			bend,
			arrowheadEnd,
			arrowheadStart: edge.type?.includes('double_arrow') ? arrowheadEnd : undefined,
			dash,
			size,
			color: cssOverrides?.color,
		})
	}

	const nodeIds = new Set(nodes.map((n) => n.id))
	const validEdges = blueprintEdges.filter(
		(e) => nodeIds.has(e.startNodeId) && nodeIds.has(e.endNodeId)
	)
	return { nodes, edges: validEdges }
}
