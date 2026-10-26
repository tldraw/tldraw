import type { FlowchartModel } from 'pele'
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
import { parsePeleLayout } from './peleDiagram'
import {
	buildNodeCentersFromSvg,
	claimEdge,
	getElbowEdgeLayout,
	getSelfLoopEdgeLayout,
	type ParsedDiagramLayout,
} from './svgParsing'
import { dropDanglingEdges, getArrowBend, orderTopDown } from './utils'

function mapEdgeTypeToArrowhead(type: string | undefined): TLArrowShapeArrowheadStyle {
	if (type?.includes('circle')) return 'dot'
	if (type?.includes('cross')) return 'bar'
	if (type?.includes('open')) return 'none'
	return 'arrow'
}

interface FlowVertex {
	type?: string
	text?: string
	styles: string[]
	classes: string[]
}
interface FlowEdge {
	start: string
	end: string
	type?: string
	text: string
	stroke?: string
	style?: string[]
}
interface FlowSubGraph {
	id: string
	nodes: string[]
	title: string
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

/** Parse pele's flowchart SVG for use by {@link flowchartToBlueprint}. */
export function parseFlowchartLayout(root: Element, model: FlowchartModel): ParsedDiagramLayout {
	const edgesById = new Map(model.edges.map((edge) => [edge.id, edge]))
	return parsePeleLayout(root, {
		edgeEnds(id) {
			const edge = edgesById.get(id)
			return edge && { start: edge.start, end: edge.end }
		},
	})
}

/** Convert a parsed flowchart into a tldraw blueprint of nodes and edges. */
export function flowchartToBlueprint(
	layout: ParsedDiagramLayout,
	vertices: Map<string, FlowVertex>,
	edges: FlowEdge[],
	subGraphs?: FlowSubGraph[],
	classDefs?: Map<string, { styles: string[] }>,
	/** `linkStyle default`, which pele keeps apart from the edges it applies to. */
	defaultEdgeStyle?: string[]
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

	// Edges: match model edges to the paths the layout drew for them, and take each one's route
	const boxes = new Map(nodes.map((node) => [node.id, node]))
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
		const startBox = boxes.get(edge.start)
		const endBox = boxes.get(edge.end)
		const elbow =
			!selfLoop && svgEdge && startBox && endBox && edge.start !== edge.end
				? getElbowEdgeLayout(svgEdge, startBox, endBox, layout.edgeLabels.get(svgEdge.id))
				: undefined
		const cssOverrides = parseCssStyles(edge.style ?? defaultEdgeStyle)
		const arrowheadEnd = mapEdgeTypeToArrowhead(edge.type)

		blueprintEdges.push({
			startNodeId: edge.start,
			endNodeId: edge.end,
			label: edge.text,
			bend: svgEdge ? getArrowBend(svgEdge) : 0,
			...selfLoop,
			...elbow,
			arrowheadEnd,
			arrowheadStart: edge.type?.includes('double_arrow') ? arrowheadEnd : undefined,
			dash: cssOverrides.dashOverride ?? (edge.stroke === 'dotted' ? 'dotted' : 'solid'),
			size: cssOverrides.sizeOverride ?? (edge.stroke === 'thick' ? 'l' : 'm'),
			color: cssOverrides.color,
		})
	}

	return { diagramKind: 'flowchart', nodes, edges: dropDanglingEdges(nodes, blueprintEdges) }
}
