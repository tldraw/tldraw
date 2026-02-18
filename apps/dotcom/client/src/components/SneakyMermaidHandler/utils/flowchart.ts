import { layout } from 'dagre-d3-es/src/dagre/index.js'
import { Graph } from 'dagre-d3-es/src/graphlib/index.js'
import type { FlowEdge, FlowSubGraph, FlowVertex } from 'mermaid/dist/diagrams/flowchart/types.js'
import { createShapeId, Editor, TLFrameShape, TLGeoShape, TLShapeId, toRichText } from 'tldraw'
import {
	FRAME_PADDING,
	FRAME_TOP_PADDING,
	HORIZONTAL_GRAPH_OPTIONS,
	VERTICAL_GRAPH_OPTIONS,
} from './constants'
import { estimateFlowNodeSize, mapFlowShapeTypeToGeo } from './mappings'
import { createEdgesFromLayout, dagreToFrameLocal } from './utils'

export function createMermaidFlowchart(
	editor: Editor,
	vertices: Map<string, FlowVertex>,
	edges: FlowEdge[],
	direction: string | undefined,
	subGraphs?: FlowSubGraph[]
) {
	direction = direction || 'TB'

	const hasSubGraphs = subGraphs && subGraphs.length > 0
	if (!hasSubGraphs) {
		createSimpleFlowchart(editor, vertices, edges, direction)
		return
	}

	createFlowchartWithSubgraphs(editor, vertices, edges, direction, subGraphs)
}

function createSimpleFlowchart(
	editor: Editor,
	vertices: Map<string, FlowVertex>,
	edges: FlowEdge[],
	direction: string
) {
	const g = runDagreLayout(vertices, edges, direction, new Map())

	const offset = editor.getViewportPageBounds().center
	const vertexShapeIds = new Map<string, TLShapeId>()

	for (const [id, v] of vertices) {
		const pos = g.node(id)
		if (!pos) continue
		const shapeId = createShapeId()
		vertexShapeIds.set(id, shapeId)
		const size = estimateFlowNodeSize(v.type, v.text)

		editor.createShape<TLGeoShape>({
			id: shapeId,
			type: 'geo',
			x: offset.x + pos.x - size.w / 2,
			y: offset.y + pos.y - size.h / 2,
			props: {
				geo: mapFlowShapeTypeToGeo(v.type),
				w: size.w,
				h: size.h,
				richText: v.text ? toRichText(v.text) : undefined,
				align: 'middle',
				verticalAlign: 'middle',
				size: 'm',
			},
		})
	}

	createEdgesFromLayout(
		editor,
		direction,
		edges.map((e) => ({
			start: e.start,
			end: e.end,
			label: e.text,
			type: e.type,
			stroke: e.stroke,
		})),
		vertexShapeIds,
		g
	)
}

function createFlowchartWithSubgraphs(
	editor: Editor,
	vertices: Map<string, FlowVertex>,
	edges: FlowEdge[],
	direction: string,
	subGraphs: FlowSubGraph[]
) {
	// Build hierarchy: determine which subgraph each node belongs to,
	// and detect nested subgraphs
	const subGraphIds = new Set(subGraphs.map((sg) => sg.id))
	const nodeToSubGraph = new Map<string, string>()
	const subGraphChildren = new Map<string, string[]>()
	const subGraphParent = new Map<string, string>()

	for (const sg of subGraphs) {
		const leafNodes: string[] = []
		for (const nodeId of sg.nodes) {
			if (subGraphIds.has(nodeId)) {
				subGraphParent.set(nodeId, sg.id)
			} else {
				if (!nodeToSubGraph.has(nodeId)) {
					nodeToSubGraph.set(nodeId, sg.id)
					leafNodes.push(nodeId)
				}
			}
		}
		subGraphChildren.set(sg.id, leafNodes)
	}

	// Find top-level nodes (not in any subgraph)
	const topLevelNodeIds = new Set<string>()
	for (const [id] of vertices) {
		if (!nodeToSubGraph.has(id)) {
			topLevelNodeIds.add(id)
		}
	}

	// Find top-level subgraphs (not nested inside another)
	const topLevelSubGraphs = subGraphs.filter((sg) => !subGraphParent.has(sg.id))

	// Ordering: bottom-up (innermost subgraphs first)
	const orderedSubGraphs = orderSubGraphsBottomUp(subGraphs, subGraphParent)

	// Pass 1: layout each subgraph's children to compute frame sizes
	const subGraphSizes = new Map<string, { w: number; h: number }>()
	const subGraphLayouts = new Map<string, Graph>()

	for (const sg of orderedSubGraphs) {
		const childNodeIds = subGraphChildren.get(sg.id) || []
		if (childNodeIds.length === 0 && !hasNestedSubGraphs(sg.id, subGraphParent)) continue

		const childVertices = new Map<string, FlowVertex>()
		for (const nodeId of childNodeIds) {
			const v = vertices.get(nodeId)
			if (v) childVertices.set(nodeId, v)
		}

		// Also add nested subgraphs as nodes with their computed sizes
		const nestedSgIds = getNestedSubGraphIds(sg.id, subGraphParent)
		for (const nestedId of nestedSgIds) {
			const nestedSize = subGraphSizes.get(nestedId)
			if (nestedSize) {
				childVertices.set(nestedId, {
					id: nestedId,
					text: '',
					classes: [],
					styles: [],
					domId: nestedId,
					labelType: 'text',
				} as FlowVertex)
			}
		}

		// Filter edges within this subgraph, and synthesize edges between
		// nested subgraphs when their children have cross-subgraph connections
		const allChildIds = new Set([...childNodeIds, ...nestedSgIds])
		const childEdges: FlowEdge[] = []
		const childSyntheticEdges = new Set<string>()

		for (const e of edges) {
			if (allChildIds.has(e.start) && allChildIds.has(e.end)) {
				childEdges.push(e)
				continue
			}

			const startEntity = resolveToChildEntity(e.start, allChildIds, nodeToSubGraph, subGraphParent)
			const endEntity = resolveToChildEntity(e.end, allChildIds, nodeToSubGraph, subGraphParent)
			if (!startEntity || !endEntity || startEntity === endEntity) continue

			const key = `${startEntity}->${endEntity}`
			if (childSyntheticEdges.has(key)) continue
			childSyntheticEdges.add(key)

			childEdges.push({
				start: startEntity,
				end: endEntity,
				type: 'arrow_point',
				text: '',
				stroke: 'normal',
			} as FlowEdge)
		}

		const childG = runDagreLayout(childVertices, childEdges, sg.dir || direction, subGraphSizes)
		subGraphLayouts.set(sg.id, childG)

		const { width, height } = childG.graph() as { width: number; height: number }
		subGraphSizes.set(sg.id, {
			w: width + FRAME_PADDING * 2,
			h: height + FRAME_PADDING + FRAME_TOP_PADDING,
		})
	}

	// Pass 2: layout the top-level graph
	const topVertices = new Map<string, FlowVertex>()
	for (const id of topLevelNodeIds) {
		const v = vertices.get(id)
		if (v) topVertices.set(id, v)
	}
	for (const sg of topLevelSubGraphs) {
		topVertices.set(sg.id, {
			id: sg.id,
			text: '',
			classes: [],
			styles: [],
			domId: sg.id,
			labelType: 'text',
		} as FlowVertex)
	}

	const topEdges: FlowEdge[] = []
	const topEntityIds = new Set([...topLevelNodeIds, ...topLevelSubGraphs.map((sg) => sg.id)])

	// Include direct top-level edges and synthesize edges between subgraphs
	// when their children have cross-subgraph connections (e.g. GW in
	// Frontend → S1 in Backend becomes a synthetic Frontend → Backend edge
	// so dagre knows to order them correctly).
	const syntheticEdges = new Set<string>()
	for (const e of edges) {
		if (topEntityIds.has(e.start) && topEntityIds.has(e.end)) {
			topEdges.push(e)
			continue
		}

		const startSg = resolveTopLevelEntity(e.start, nodeToSubGraph, subGraphParent)
		const endSg = resolveTopLevelEntity(e.end, nodeToSubGraph, subGraphParent)
		if (!startSg || !endSg || startSg === endSg) continue
		if (!topEntityIds.has(startSg) || !topEntityIds.has(endSg)) continue

		const key = `${startSg}->${endSg}`
		if (syntheticEdges.has(key)) continue
		syntheticEdges.add(key)

		topEdges.push({
			start: startSg,
			end: endSg,
			type: 'arrow_point',
			text: '',
			stroke: 'normal',
		} as FlowEdge)
	}

	const mainG = runDagreLayout(topVertices, topEdges, direction, subGraphSizes)

	const offset = editor.getViewportPageBounds().center
	const { width: graphWidth, height: graphHeight } = mainG.graph() as {
		width: number
		height: number
	}
	const halfW = graphWidth / 2
	const halfH = graphHeight / 2

	const shapeIds = new Map<string, TLShapeId>()
	const framePagePositions = new Map<string, { x: number; y: number }>()

	// Create subgraph frames (top-down so parents exist before children)
	const subGraphsByTitle = new Map(subGraphs.map((sg) => [sg.id, sg]))
	const topDownSubGraphs = [...orderedSubGraphs].reverse()
	for (const sg of topDownSubGraphs) {
		const size = subGraphSizes.get(sg.id)
		if (!size) continue

		let frameX: number
		let frameY: number
		let parentFrameId: TLShapeId | undefined
		const parentId = subGraphParent.get(sg.id)

		if (!parentId) {
			const mainPos = mainG.node(sg.id)
			if (!mainPos) continue
			frameX = offset.x + mainPos.x - size.w / 2 - halfW
			frameY = offset.y + mainPos.y - size.h / 2 - halfH
		} else {
			const parentLayout = subGraphLayouts.get(parentId)
			const parentPagePos = framePagePositions.get(parentId)
			const parentSize = subGraphSizes.get(parentId)
			if (!parentLayout || !parentPagePos || !parentSize) continue

			const posInParent = parentLayout.node(sg.id)
			if (!posInParent) continue

			const graphSize = parentLayout.graph() as { width: number; height: number }
			const local = dagreToFrameLocal(posInParent, size, graphSize, parentSize)
			frameX = parentPagePos.x + local.x
			frameY = parentPagePos.y + local.y
			parentFrameId = shapeIds.get(parentId)
		}

		framePagePositions.set(sg.id, { x: frameX, y: frameY })

		const frameId = createShapeId()
		shapeIds.set(sg.id, frameId)

		const sgData = subGraphsByTitle.get(sg.id)

		editor.createShape<TLFrameShape>({
			id: frameId,
			type: 'frame',
			x: parentFrameId ? frameX - framePagePositions.get(parentId!)!.x : frameX,
			y: parentFrameId ? frameY - framePagePositions.get(parentId!)!.y : frameY,
			parentId: parentFrameId,
			props: {
				w: size.w,
				h: size.h,
				name: sgData?.title || sg.id,
			},
		})

		// Create leaf nodes inside this frame
		const childG = subGraphLayouts.get(sg.id)
		if (!childG) continue

		const childGraphSize = childG.graph() as { width: number; height: number }
		const childNodeIds = subGraphChildren.get(sg.id) || []

		for (const nodeId of childNodeIds) {
			const childPos = childG.node(nodeId)
			if (!childPos) continue

			const v = vertices.get(nodeId)
			if (!v) continue

			const nodeSize = estimateFlowNodeSize(v.type, v.text)
			const local = dagreToFrameLocal(childPos, nodeSize, childGraphSize, size)

			const shapeId = createShapeId()
			shapeIds.set(nodeId, shapeId)

			editor.createShape<TLGeoShape>({
				id: shapeId,
				type: 'geo',
				x: local.x,
				y: local.y,
				parentId: frameId,
				props: {
					geo: mapFlowShapeTypeToGeo(v.type),
					w: nodeSize.w,
					h: nodeSize.h,
					richText: v.text ? toRichText(v.text) : undefined,
					align: 'middle',
					verticalAlign: 'middle',
					size: 'm',
				},
			})
		}
	}

	// Create top-level nodes (not in any subgraph)
	for (const id of topLevelNodeIds) {
		const pos = mainG.node(id)
		if (!pos) continue
		const v = vertices.get(id)
		if (!v) continue

		const size = estimateFlowNodeSize(v.type, v.text)
		const shapeId = createShapeId()
		shapeIds.set(id, shapeId)

		editor.createShape<TLGeoShape>({
			id: shapeId,
			type: 'geo',
			x: offset.x + pos.x - size.w / 2 - halfW,
			y: offset.y + pos.y - size.h / 2 - halfH,
			props: {
				geo: mapFlowShapeTypeToGeo(v.type),
				w: size.w,
				h: size.h,
				richText: v.text ? toRichText(v.text) : undefined,
				align: 'middle',
				verticalAlign: 'middle',
				size: 'm',
			},
		})
	}

	// Create all edges
	createEdgesFromLayout(
		editor,
		direction,
		edges.map((e) => ({
			start: e.start,
			end: e.end,
			label: e.text,
			type: e.type,
			stroke: e.stroke,
		})),
		shapeIds
	)
}

function runDagreLayout(
	vertices: Map<string, FlowVertex>,
	edges: FlowEdge[],
	direction: string,
	subGraphSizes: Map<string, { w: number; h: number }>
): Graph {
	const isVertical = ['TB', 'BT'].includes(direction)
	const baseOptions = isVertical ? VERTICAL_GRAPH_OPTIONS : HORIZONTAL_GRAPH_OPTIONS
	// calculate the maximum char length for a label
	const maxLabelLen = edges.reduce((max, e) => Math.max(max, (e.text ?? '').length), 0)
	const ranksep = isVertical
		? baseOptions.ranksep
		: Math.max(baseOptions.ranksep, maxLabelLen * 20 + 20)
	const g = new Graph({ multigraph: true, compound: true })
		.setGraph({
			rankdir: direction,
			...baseOptions,
			ranksep,
		})
		.setDefaultEdgeLabel(() => ({}))

	for (const [id, v] of vertices) {
		const sgSize = subGraphSizes.get(id)
		if (sgSize) {
			g.setNode(id, { width: sgSize.w, height: sgSize.h })
		} else {
			const size = estimateFlowNodeSize(v.type, v.text)
			g.setNode(id, { width: size.w, height: size.h })
		}
	}

	for (const edge of edges) {
		if (g.hasNode(edge.start) && g.hasNode(edge.end)) {
			g.setEdge(edge.start, edge.end, {
				minlen: edge.length || 1,
			})
		}
	}

	layout(g, {})
	return g
}

function orderSubGraphsBottomUp(
	subGraphs: FlowSubGraph[],
	parentMap: Map<string, string>
): FlowSubGraph[] {
	const byId = new Map(subGraphs.map((sg) => [sg.id, sg]))
	const visited = new Set<string>()
	const result: FlowSubGraph[] = []

	function visit(id: string) {
		if (visited.has(id)) return
		visited.add(id)
		// Visit children first (bottom-up)
		for (const sg of subGraphs) {
			if (parentMap.get(sg.id) === id) {
				visit(sg.id)
			}
		}
		const sg = byId.get(id)
		if (sg) result.push(sg)
	}

	for (const sg of subGraphs) {
		if (!parentMap.has(sg.id)) {
			visit(sg.id)
		}
	}

	return result
}

function resolveToChildEntity(
	nodeId: string,
	childIds: Set<string>,
	nodeToSubGraph: Map<string, string>,
	subGraphParent: Map<string, string>
): string | undefined {
	if (childIds.has(nodeId)) return nodeId
	let sgId = nodeToSubGraph.get(nodeId)
	if (!sgId) return undefined
	while (sgId && !childIds.has(sgId)) {
		sgId = subGraphParent.get(sgId)
	}
	return sgId
}

function resolveTopLevelEntity(
	nodeId: string,
	nodeToSubGraph: Map<string, string>,
	subGraphParent: Map<string, string>
): string | undefined {
	const sgId = nodeToSubGraph.get(nodeId)
	if (!sgId) return nodeId
	let current = sgId
	while (subGraphParent.has(current)) {
		current = subGraphParent.get(current)!
	}
	return current
}

function hasNestedSubGraphs(sgId: string, parentMap: Map<string, string>): boolean {
	for (const [, parent] of parentMap) {
		if (parent === sgId) return true
	}
	return false
}

function getNestedSubGraphIds(sgId: string, parentMap: Map<string, string>): string[] {
	const result: string[] = []
	for (const [childId, parent] of parentMap) {
		if (parent === sgId) result.push(childId)
	}
	return result
}
