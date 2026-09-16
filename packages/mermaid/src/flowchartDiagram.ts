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
	claimEdge,
	getSelfLoopEdgeLayout,
	parseAllEdgePointsFromSvg,
	parseClustersFromSvg,
	parseDomId,
	parseEdgeLabelsFromSvg,
	type ParsedDiagramLayout,
	parseNodesFromSvg,
	scaleLayout,
	stripDiagramIdPrefix,
	type Vec2,
} from './svgParsing'
import { dropDanglingEdges, getArrowBend, LAYOUT_SCALE, orderTopDown } from './utils'

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

/**
 * Split mermaid's edge id, `L_<start>_<end>_<n>`, back into the two ids it joins. Node ids can
 * contain underscores themselves, so the split is ambiguous: `L_a_b_c_0` joins `a` to `b_c` in a
 * diagram with those, and `a_b` to `c` in one with those. A diagram with all four settles it the
 * only way left, by which pair the path was actually drawn between. `centers` holds everything an
 * edge can end on, subgraphs as well as nodes, since mermaid links those too.
 */
function parseEdgeId(dataId: string, points: Vec2[], centers: Map<string, Vec2>) {
	const match = dataId.match(/(?:^|-)L_(.+)_\d+$/)
	if (!match) return null

	const joined = match[1]
	const last = points[points.length - 1]
	let best: { start: string; end: string } | undefined
	let bestDistance = Infinity
	for (let at = joined.indexOf('_'); at > 0; at = joined.indexOf('_', at + 1)) {
		const start = joined.slice(0, at)
		const end = joined.slice(at + 1)
		const startCenter = centers.get(start)
		const endCenter = centers.get(end)
		if (!startCenter || !endCenter) continue

		const distance = last
			? Math.hypot(points[0].x - startCenter.x, points[0].y - startCenter.y) +
				Math.hypot(last.x - endCenter.x, last.y - endCenter.y)
			: 0
		if (distance < bestDistance) {
			bestDistance = distance
			best = { start, end }
		}
	}
	if (best) return best

	// An id naming no pair the diagram drew, such as an edge to a node mermaid left out. Splitting at
	// the last underscore is right whenever the end id has none, and leaves the edge to be matched by
	// proximity when it isn't.
	const at = joined.lastIndexOf('_')
	return at > 0 ? { start: joined.slice(0, at), end: joined.slice(at + 1) } : null
}

/** Parse flowchart-specific SVG layout data for use by {@link flowchartToBlueprint}. */
export function parseFlowchartLayout(root: Element): ParsedDiagramLayout {
	const nodes = parseNodesFromSvg(root, '.node', (domId) => parseDomId(domId, NODE_ID))
	const clusters = parseClustersFromSvg(root, '.cluster', stripDiagramIdPrefix)
	const centers = buildNodeCentersFromSvg(nodes, clusters)
	const edges = parseAllEdgePointsFromSvg(root, (dataId, points) =>
		parseEdgeId(dataId, points, centers)
	)
	const layout = { nodes, clusters, edges, edgeLabels: parseEdgeLabelsFromSvg(root) }
	scaleLayout(layout, LAYOUT_SCALE)
	return layout
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

	// Edges: match DB edges to the paths mermaid drew for them, and take each one's bend
	const claimed = new Set<number>()
	for (const edge of edges) {
		const svgEdge = claimEdge(svgEdges, claimed, {
			startId: edge.start,
			endId: edge.end,
			startCenter: nodeCenters.get(edge.start),
			endCenter: nodeCenters.get(edge.end),
		})
		const svgNode = svgNodes.get(edge.start)
		const selfLoop =
			edge.start === edge.end && svgEdge && svgNode
				? getSelfLoopEdgeLayout(svgEdge, svgNode, layout.edgeLabels)
				: undefined
		const cssOverrides = parseCssStyles(edge.style)
		const arrowheadEnd = mapEdgeTypeToArrowhead(edge.type)

		blueprintEdges.push({
			startNodeId: edge.start,
			endNodeId: edge.end,
			label: edge.text,
			bend: svgEdge ? getArrowBend(svgEdge) : 0,
			...selfLoop,
			arrowheadEnd,
			arrowheadStart: edge.type?.includes('double_arrow') ? arrowheadEnd : undefined,
			dash: cssOverrides.dashOverride ?? (edge.stroke === 'dotted' ? 'dotted' : 'solid'),
			size: cssOverrides.sizeOverride ?? (edge.stroke === 'thick' ? 'l' : 's'),
			color: cssOverrides.color,
		})
	}

	return { diagramKind: 'flowchart', nodes, edges: dropDanglingEdges(nodes, blueprintEdges) }
}
