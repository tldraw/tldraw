import type { FlowEdge, FlowSubGraph, FlowVertex } from 'mermaid/dist/diagrams/flowchart/types.js'
import { createShapeId, Editor, TLGeoShape, TLShapeId, toRichText } from 'tldraw'
import { mapFlowShapeTypeToGeo, parseClassDefFills, parseCssStyles } from './mappings'
import {
	buildNodeCentersFromSvg,
	computeBounds,
	mountSvg,
	parseAllEdgePointsFromSvg,
	parseClustersFromSvg,
	parseNodesFromSvg,
	scaleLayout,
	type Vec2,
} from './svgParsing'
import {
	centerOnViewport,
	createEdgesFromLayout,
	createFrameShape,
	LAYOUT_SCALE,
	orderTopDown,
	sanitizeDiagramText,
} from './utils'

// ---------------------------------------------------------------------------
// Flowchart-specific ID parsers
// ---------------------------------------------------------------------------

function flowchartNodeIdParser(domId: string): string {
	const m = domId.match(/^flowchart-(.+)-\d+$/)
	return m ? m[1] : domId
}

function flowchartEdgeIdParser(dataId: string): { start: string; end: string } | null {
	const m = dataId.match(/^L_(.+)_([^_]+)_\d+$/)
	return m ? { start: m[1], end: m[2] } : null
}

// ---------------------------------------------------------------------------
// Subgraph hierarchy
// ---------------------------------------------------------------------------

function buildHierarchy(subGraphs: FlowSubGraph[]) {
	const sgIds = new Set(subGraphs.map((sg) => sg.id))
	const nodeToSg = new Map<string, string>()
	const sgParent = new Map<string, string>()

	for (const sg of subGraphs) {
		for (const nodeId of sg.nodes) {
			if (sgIds.has(nodeId)) {
				sgParent.set(nodeId, sg.id)
			} else if (!nodeToSg.has(nodeId)) {
				nodeToSg.set(nodeId, sg.id)
			}
		}
	}

	return { nodeToSg, sgParent }
}

// ---------------------------------------------------------------------------
// Node sizing
// ---------------------------------------------------------------------------

function computeFlowNodeSize(
	v: FlowVertex,
	svgNode: { width: number; height: number }
): { w: number; h: number } {
	const geo = mapFlowShapeTypeToGeo(v.type)

	if (geo === 'diamond') {
		return { w: svgNode.width, h: svgNode.height }
	}
	if (geo === 'ellipse') {
		return { w: svgNode.width + 20, h: svgNode.height + 10 }
	}
	return { w: svgNode.width + 10, h: svgNode.height + 5 }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

const FRAME_TOP_PAD = 14
const FLOW_KNOWN_CLASSES = new Set(['node', 'default', 'flowchart-label'])

export function createFlowchart(
	editor: Editor,
	svgString: string,
	vertices: Map<string, FlowVertex>,
	edges: FlowEdge[],
	subGraphs?: FlowSubGraph[]
) {
	const { root, cleanup } = mountSvg(svgString)
	const nodeFillMap = parseClassDefFills(svgString, 'flowchart-', FLOW_KNOWN_CLASSES)
	const svgNodes = parseNodesFromSvg(root, '.node', flowchartNodeIdParser)
	const svgClusters = parseClustersFromSvg(root, '.cluster')
	const svgEdges = parseAllEdgePointsFromSvg(root, flowchartEdgeIdParser)
	cleanup()

	scaleLayout(svgNodes, svgClusters, svgEdges, LAYOUT_SCALE)

	const nodeCenters = buildNodeCentersFromSvg(svgNodes, svgClusters)

	const sgs = subGraphs || []
	const { nodeToSg, sgParent } = buildHierarchy(sgs)

	// Bounds from parsed SVG nodes and clusters (same coordinate space as node centers)
	const bounds = computeBounds(svgNodes, svgClusters)
	const { ox, oy } = centerOnViewport(editor, bounds)

	const shapeIds = new Map<string, TLShapeId>()
	const frameAbs = new Map<string, Vec2>()

	// ---- frames for subgraphs (top-down so parents exist first) ----
	if (sgs.length > 0) {
		for (const sg of orderTopDown(
			sgs,
			(s) => s.id,
			(s) => sgParent.get(s.id)
		)) {
			const c = svgClusters.get(sg.id)
			if (!c) continue

			const absX = ox + c.topLeft.x
			const absY = oy + c.topLeft.y - FRAME_TOP_PAD
			frameAbs.set(sg.id, { x: absX, y: absY })

			const parentId = sgParent.get(sg.id)
			const frameId = createShapeId()
			shapeIds.set(sg.id, frameId)

			createFrameShape(
				editor,
				frameId,
				absX,
				absY,
				c.width,
				c.height + FRAME_TOP_PAD,
				sg.title || sg.id,
				parentId ? shapeIds.get(parentId) : undefined,
				parentId ? frameAbs.get(parentId) : undefined
			)
		}
	}

	// ---- node shapes ----
	for (const [id, v] of vertices) {
		const n = svgNodes.get(id)
		if (!n) continue

		const { w, h } = computeFlowNodeSize(v, n)
		const absX = ox + n.center.x - w / 2
		const absY = oy + n.center.y - h / 2

		const parentSgId = nodeToSg.get(id)
		const parentFrameId = parentSgId ? shapeIds.get(parentSgId) : undefined
		const parentPos = parentSgId ? frameAbs.get(parentSgId) : undefined

		const shapeId = createShapeId()
		shapeIds.set(id, shapeId)

		const fillColor = nodeFillMap.get(id)
		const geo = mapFlowShapeTypeToGeo(v.type)

		let width = w
		let height = h
		/*
		 * Ellipse can come from various shape that we resolve as circle but can be "pill shaped"
		 * so the idea if to make sure they end up being represented as circle by
		 * taking the max value between w and h
		 */
		if (geo === 'ellipse') {
			width = Math.max(w, h)
			height = Math.max(w, h)
		}

		editor.createShape<TLGeoShape>({
			id: shapeId,
			type: 'geo',
			x: parentPos ? absX - parentPos.x : absX,
			y: parentPos ? absY - parentPos.y : absY,
			parentId: parentFrameId,
			props: {
				geo,
				w: width,
				h: height,
				...(fillColor && { fill: 'solid' as const, color: fillColor }),
				richText: v.text ? toRichText(sanitizeDiagramText(v.text)) : undefined,
				align: 'middle',
				verticalAlign: 'middle',
				size: 'm',
			},
		})
	}

	// ---- edges ----
	createEdgesFromLayout(
		editor,
		edges.map((e) => ({
			start: e.start,
			end: e.end,
			label: e.text,
			type: e.type,
			stroke: e.stroke,
			cssOverrides: e.style ? parseCssStyles(e.style) : undefined,
		})),
		shapeIds,
		svgEdges,
		nodeCenters
	)
}
