import type { FlowEdge, FlowSubGraph, FlowVertex } from 'mermaid/dist/diagrams/flowchart/types.js'
import type {
	DiagramMermaidBlueprint,
	MermaidBlueprintEdge,
	MermaidBlueprintGeoNode,
} from './blueprint'
import {
	mapEdgeStrokeToDash,
	mapEdgeTypeToArrowhead,
	mapFlowShapeTypeToGeo,
	parseClassDefFills,
	parseCssStyles,
} from './mappings'
import {
	buildNodeCentersFromSvg,
	parseAllEdgePointsFromSvg,
	parseClustersFromSvg,
	parseNodesFromSvg,
	scaleLayout,
} from './svgParsing'
import { getArrowBend, LAYOUT_SCALE, orderTopDown, sanitizeDiagramText } from './utils'

const FRAME_TOP_PAD = 14
const FLOW_KNOWN_CLASSES = new Set(['node', 'default', 'flowchart-label'])

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

export function flowchartToBlueprint(
	root: Element,
	vertices: Map<string, FlowVertex>,
	edges: FlowEdge[],
	subGraphs?: FlowSubGraph[]
): DiagramMermaidBlueprint {
	const nodeFillMap = parseClassDefFills(root.outerHTML, 'flowchart-', FLOW_KNOWN_CLASSES)
	const svgNodes = parseNodesFromSvg(root, '.node', (domId) => {
		const match = domId.match(/^flowchart-(.+)-\d+$/)
		return match ? match[1] : domId
	})
	const svgClusters = parseClustersFromSvg(root, '.cluster')
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
		const fillColor = nodeFillMap.get(id)

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
			label: vertex.text ? sanitizeDiagramText(vertex.text) : undefined,
			...(fillColor && { fill: 'solid' as const, color: fillColor }),
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
				if (claimed.has(i)) continue
				const points = svgEdges[i].points
				if (points.length < 2) continue
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

	return { nodes, edges: blueprintEdges }
}
