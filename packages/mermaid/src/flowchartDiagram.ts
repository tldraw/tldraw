import type {
	FlowClass,
	FlowEdge,
	FlowSubGraph,
	FlowVertex,
} from 'mermaid/dist/diagrams/flowchart/types.js'
import { TLArrowShapeArrowheadStyle } from 'tldraw'
import type {
	DiagramMermaidBlueprint,
	MermaidBlueprintEdge,
	MermaidBlueprintNode,
} from './blueprint'
import {
	buildClassDefColorMap,
	parseCssStyles,
	parseNodeInlineColor,
	toNodeColorProps,
} from './colors'
import {
	buildNodeCentersFromSvg,
	claimNearestEdgeBend,
	parseAllEdgePointsFromSvg,
	parseClustersFromSvg,
	parseDomId,
	type ParsedDiagramLayout,
	parseNodesFromSvg,
	scaleLayout,
	stripDiagramIdPrefix,
} from './svgParsing'
import { dropDanglingEdges, LAYOUT_SCALE, orderTopDown } from './utils'

function mapEdgeTypeToArrowhead(type: string | undefined): TLArrowShapeArrowheadStyle {
	if (type?.includes('circle')) return 'dot'
	if (type?.includes('cross')) return 'bar'
	if (type?.includes('open')) return 'none'
	return 'arrow'
}

const FRAME_TOP_PAD = 14
const NODE_ID = /^flowchart-(.+)-\d+$/

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

/** Parse flowchart-specific SVG layout data for use by {@link flowchartToBlueprint}. */
export function parseFlowchartLayout(root: Element): ParsedDiagramLayout {
	const nodes = parseNodesFromSvg(root, '.node', (domId) => parseDomId(domId, NODE_ID))
	const clusters = parseClustersFromSvg(root, '.cluster', stripDiagramIdPrefix)
	const edges = parseAllEdgePointsFromSvg(root, (dataId) => {
		const match = dataId.match(/(?:^|-)L_(.+)_([^_]+)_\d+$/)
		return match ? { start: match[1], end: match[2] } : null
	})
	scaleLayout(nodes, clusters, edges, LAYOUT_SCALE)
	return { nodes, clusters, edges }
}

/** Convert a parsed Mermaid flowchart into a tldraw blueprint of nodes and edges. */
export function flowchartToBlueprint(
	layout: ParsedDiagramLayout,
	vertices: Map<string, FlowVertex>,
	edges: FlowEdge[],
	subGraphs?: FlowSubGraph[],
	classDefs?: Map<string, FlowClass>
): DiagramMermaidBlueprint {
	const nodeColorMap = buildClassDefColorMap(classDefs ?? new Map(), vertices)
	const { nodes: svgNodes, clusters: svgClusters, edges: svgEdges } = layout
	const nodeCenters = buildNodeCentersFromSvg(svgNodes, svgClusters)

	const allSubGraphs = subGraphs || []
	const { nodeToSubGraph, subGraphParent } = buildHierarchy(allSubGraphs)

	const nodes: MermaidBlueprintNode[] = []
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
			kind: 'subgraph',
			x: cluster.topLeft.x,
			y: cluster.topLeft.y - FRAME_TOP_PAD,
			w: cluster.width,
			h: cluster.height + FRAME_TOP_PAD,
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

		let { width: w, height: h } = svgNode
		if (vertex.type === 'circle' || vertex.type === 'doublecircle') {
			w = h = Math.max(w, h)
		}

		nodes.push({
			id,
			kind: vertex.type ?? 'rect',
			x: svgNode.center.x - w / 2,
			y: svgNode.center.y - h / 2,
			w,
			h,
			parentId: nodeToSubGraph.get(id),
			label: vertex.text || undefined,
			...toNodeColorProps(nodeColorMap.get(id) ?? parseNodeInlineColor(vertex.styles)),
			align: 'middle',
			verticalAlign: 'middle',
			size: 'm',
		})
	}

	// Edges: match DB edges to SVG edges by proximity, compute bends
	const claimed = new Set<number>()
	for (const edge of edges) {
		const bend = claimNearestEdgeBend(
			svgEdges,
			claimed,
			nodeCenters.get(edge.start),
			nodeCenters.get(edge.end)
		)
		const cssOverrides = parseCssStyles(edge.style)
		const arrowheadEnd = mapEdgeTypeToArrowhead(edge.type)

		blueprintEdges.push({
			startNodeId: edge.start,
			endNodeId: edge.end,
			label: edge.text,
			bend,
			arrowheadEnd,
			arrowheadStart: edge.type?.includes('double_arrow') ? arrowheadEnd : undefined,
			dash: cssOverrides.dashOverride ?? (edge.stroke === 'dotted' ? 'dotted' : 'solid'),
			size: cssOverrides.sizeOverride ?? (edge.stroke === 'thick' ? 'l' : 's'),
			color: cssOverrides.color,
		})
	}

	return { diagramKind: 'flowchart', nodes, edges: dropDanglingEdges(nodes, blueprintEdges) }
}
