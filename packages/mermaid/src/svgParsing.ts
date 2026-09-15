import { clamp } from 'tldraw'
import { getSelfLoopBend } from './utils'

export interface Vec2 {
	x: number
	y: number
}

export interface ParsedNode {
	id: string
	center: Vec2
	width: number
	height: number
}

export interface ParsedCluster {
	id: string
	topLeft: Vec2
	width: number
	height: number
}

export interface ParsedEdge {
	/** Mermaid's `data-id` for the path, shared with the edge's label in the SVG. */
	id: string
	start: string
	end: string
	points: Vec2[]
}

export interface ParsedEdgeLabel {
	x: number
	y: number
	w: number
	h: number
}

/**
 * Pre-parsed SVG layout for flowchart and state diagram converters.
 * Contains already-scaled node, cluster, and edge data.
 */
export interface ParsedDiagramLayout {
	nodes: Map<string, ParsedNode>
	clusters: Map<string, ParsedCluster>
	edges: ParsedEdge[]
	/** Label boxes keyed by the {@link ParsedEdge.id} of the edge they belong to. */
	edgeLabels: Map<string, ParsedEdgeLabel>
}

type NodeIdParser = (domId: string) => string
type EdgeIdParser = (dataId: string) => { start: string; end: string } | null

// Mermaid >= 11.15 prefixes every rendered element id with the diagram id
// (`mermaid-0-flowchart-A-0` instead of `flowchart-A-0`); older versions do not.
const DIAGRAM_ID_PREFIX = /^mermaid-\d+-/

export function stripDiagramIdPrefix(domId: string): string {
	return domId.replace(DIAGRAM_ID_PREFIX, '')
}

/** Extract the first capture group of `pattern` from a dom id, tolerating the diagram-id prefix. */
export function parseDomId(domId: string, pattern: RegExp): string {
	const bareId = stripDiagramIdPrefix(domId)
	return bareId.match(pattern)?.[1] ?? bareId
}

function parseTranslate(attr: string | null): Vec2 {
	// Matches SVG translate transforms, e.g. transform="translate(123.45, 67.8)".
	// Handles scientific notation (1.2e+3). Group 1 = x offset, group 2 = y offset.
	const match = attr?.match(/translate\(\s*([\d.e+-]+)[,\s]+([\d.e+-]+)\s*\)/)
	if (!match) return { x: 0, y: 0 }
	return { x: parseFloat(match[1]), y: parseFloat(match[2]) }
}

export function getAccumulatedTranslate(el: Element): Vec2 {
	let x = 0
	let y = 0
	for (let cur = el.parentElement; cur; cur = cur.parentElement) {
		const t = parseTranslate(cur.getAttribute('transform'))
		x += t.x
		y += t.y
	}
	return { x, y }
}

function getBBoxSize(el: Element | null): { w: number; h: number } | undefined {
	if (!el) return undefined
	try {
		const bbox = (el as SVGGraphicsElement).getBBox()
		if (bbox.width > 0 && bbox.height > 0) return { w: bbox.width, h: bbox.height }
	} catch {
		// not a live SVG element (e.g. jsdom)
	}
	return undefined
}

/**
 * Extract element dimensions from a live SVG element using getBBox(),
 * falling back to attribute parsing for non-browser environments (jsdom).
 */
function getNodeDimensions(groupEl: Element): { w: number; h: number } {
	const bbox = getBBoxSize(groupEl.querySelector('.label-container')) ?? getBBoxSize(groupEl)
	if (bbox) return bbox

	const rect = groupEl.querySelector('rect')
	if (rect) {
		const w = parseFloat(rect.getAttribute('width') || '0')
		const h = parseFloat(rect.getAttribute('height') || '0')
		if (w > 0 && h > 0) return { w, h }
	}
	const poly = groupEl.querySelector('polygon')
	if (poly) {
		const pts = (poly.getAttribute('points') || '')
			.trim()
			.split(/\s+/)
			.map((pointStr) => pointStr.split(',').map(Number))
		let minX = Infinity
		let maxX = -Infinity
		let minY = Infinity
		let maxY = -Infinity
		for (const [px, py] of pts) {
			minX = Math.min(minX, px)
			maxX = Math.max(maxX, px)
			minY = Math.min(minY, py)
			maxY = Math.max(maxY, py)
		}
		if (maxX > minX && maxY > minY) return { w: maxX - minX, h: maxY - minY }
	}
	const circle = groupEl.querySelector('circle')
	if (circle) {
		const r = parseFloat(circle.getAttribute('r') || '0')
		if (r > 0) return { w: r * 2, h: r * 2 }
	}
	const ellipse = groupEl.querySelector('ellipse')
	if (ellipse) {
		const w = parseFloat(ellipse.getAttribute('rx') || '0') * 2
		const h = parseFloat(ellipse.getAttribute('ry') || '0') * 2
		if (w > 0 && h > 0) return { w, h }
	}
	return { w: 0, h: 0 }
}

export function parseNodesFromSvg(
	root: Element,
	selector: string,
	idParser: NodeIdParser
): Map<string, ParsedNode> {
	const out = new Map<string, ParsedNode>()
	for (const groupEl of root.querySelectorAll(selector)) {
		const id = idParser(groupEl.getAttribute('id') || '')
		const self = parseTranslate(groupEl.getAttribute('transform'))
		const ancestor = getAccumulatedTranslate(groupEl)
		const { w, h } = getNodeDimensions(groupEl)
		out.set(id, {
			id,
			center: { x: ancestor.x + self.x, y: ancestor.y + self.y },
			width: w,
			height: h,
		})
	}
	return out
}

export function parseClustersFromSvg(
	root: Element,
	selector: string,
	idParser: NodeIdParser
): Map<string, ParsedCluster> {
	const out = new Map<string, ParsedCluster>()
	for (const groupEl of root.querySelectorAll(selector)) {
		const id = idParser(groupEl.getAttribute('id') || '')
		const rect = groupEl.querySelector('rect')
		if (!rect) continue
		const rx = parseFloat(rect.getAttribute('x') || '0')
		const ry = parseFloat(rect.getAttribute('y') || '0')
		const w = parseFloat(rect.getAttribute('width') || '0')
		const h = parseFloat(rect.getAttribute('height') || '0')
		const self = parseTranslate(groupEl.getAttribute('transform'))
		const ancestor = getAccumulatedTranslate(groupEl)
		out.set(id, {
			id,
			topLeft: { x: ancestor.x + self.x + rx, y: ancestor.y + self.y + ry },
			width: w,
			height: h,
		})
	}
	return out
}

/**
 * Parse every SVG edge path in DOM order (matching mermaid's edge list order).
 * Unlike the old per-pair map, this preserves all parallel edges individually.
 */
export function parseAllEdgePointsFromSvg(root: Element, parser: EdgeIdParser): ParsedEdge[] {
	const out: ParsedEdge[] = []
	for (const path of root.querySelectorAll('path[data-points]')) {
		const dataId = path.getAttribute('data-id') || path.getAttribute('id') || ''
		const dataPoints = path.getAttribute('data-points')
		if (!dataPoints) continue
		const parsed = parser(dataId)
		if (!parsed) continue
		try {
			const points = JSON.parse(atob(dataPoints))
			const ancestor = getAccumulatedTranslate(path as Element)
			for (const point of points) {
				point.x += ancestor.x
				point.y += ancestor.y
			}
			out.push({ id: dataId, start: parsed.start, end: parsed.end, points })
		} catch {
			/* ignore malformed data */
		}
	}
	return out
}

/**
 * Parse the box mermaid laid each edge label out in, keyed by the `data-id` it shares with its
 * path. Edges without text still get an empty label group, which is skipped.
 */
export function parseEdgeLabelsFromSvg(root: Element): Map<string, ParsedEdgeLabel> {
	const out = new Map<string, ParsedEdgeLabel>()
	for (const label of root.querySelectorAll('.edgeLabel .label[data-id]')) {
		const size = getBBoxSize(label) ?? getForeignObjectSize(label)
		if (!size) continue
		const ancestor = getAccumulatedTranslate(label)
		const self = parseTranslate(label.getAttribute('transform'))
		out.set(label.getAttribute('data-id')!, {
			x: ancestor.x + self.x,
			y: ancestor.y + self.y,
			w: size.w,
			h: size.h,
		})
	}
	return out
}

function getForeignObjectSize(el: Element): { w: number; h: number } | undefined {
	const foreignObject = el.querySelector('foreignObject')
	const w = parseFloat(foreignObject?.getAttribute('width') || '0')
	const h = parseFloat(foreignObject?.getAttribute('height') || '0')
	return w > 0 && h > 0 ? { w, h } : undefined
}

/**
 * Build a map of node/cluster id → center (for flowchart and state diagram edge matching).
 */
export function buildNodeCentersFromSvg(
	nodes: Map<string, ParsedNode>,
	clusters: Map<string, ParsedCluster>
): Map<string, Vec2> {
	const out = new Map<string, Vec2>()
	for (const [id, node] of nodes) {
		out.set(id, { x: node.center.x, y: node.center.y })
	}
	for (const [id, cluster] of clusters) {
		out.set(id, {
			x: cluster.topLeft.x + cluster.width / 2,
			y: cluster.topLeft.y + cluster.height / 2,
		})
	}
	return out
}

/**
 * Claim the unclaimed SVG edge whose endpoints lie closest to the given node
 * centers, or undefined when nothing matches. Each SVG edge is claimed at most
 * once so parallel edges get distinct paths.
 */
export function claimNearestEdge(
	svgEdges: ParsedEdge[],
	claimed: Set<number>,
	startCenter: Vec2 | undefined,
	endCenter: Vec2 | undefined
): ParsedEdge | undefined {
	if (!startCenter || !endCenter) return undefined

	let bestIndex = -1
	let bestDistance = Infinity
	for (let i = 0; i < svgEdges.length; i++) {
		if (claimed.has(i) || svgEdges[i].points.length < 2) continue

		const points = svgEdges[i].points
		const last = points[points.length - 1]
		const distance =
			Math.hypot(points[0].x - startCenter.x, points[0].y - startCenter.y) +
			Math.hypot(last.x - endCenter.x, last.y - endCenter.y)
		if (distance < bestDistance) {
			bestDistance = distance
			bestIndex = i
		}
	}
	if (bestIndex < 0) return undefined

	claimed.add(bestIndex)
	return svgEdges[bestIndex]
}

/** How far either side of its middle a top or bottom self-loop's ends sit, as a fraction of the edge. */
const SELF_LOOP_EDGE_SPREAD = 0.4

/**
 * Where a self-loop leaves and re-enters its node, and how far out it reaches. Mermaid loops out of
 * the side facing the next rank (the bottom of a top-down chart, the right of a left-to-right one)
 * with the label just beyond; anywhere else, loop and label land on the node.
 */
export function getSelfLoopEdgeLayout(
	svgEdge: ParsedEdge,
	node: ParsedNode,
	edgeLabels: Map<string, ParsedEdgeLabel>
) {
	if (svgEdge.points.length < 2 || !(node.width > 0 && node.height > 0)) return undefined
	const left = node.center.x - node.width / 2
	const top = node.center.y - node.height / 2
	const toAnchor = (point: Vec2) => ({
		x: clamp((point.x - left) / node.width, 0, 1),
		y: clamp((point.y - top) / node.height, 0, 1),
	})
	const start = toAnchor(svgEdge.points[0])
	const end = toAnchor(svgEdge.points[svgEdge.points.length - 1])
	// tldraw wraps an arrow's label to the arrow's width less 64px whenever it is wider than tall,
	// as a loop on the top or bottom edge always is. Spread its ends across that edge to give the
	// label room; the chord stays on the same line, so where the label lands is unchanged.
	if (start.y === end.y && (start.y === 0 || start.y === 1)) {
		const middle = (start.x + end.x) / 2
		const halfSpan = Math.min(SELF_LOOP_EDGE_SPREAD, middle, 1 - middle)
		const direction = Math.sign(end.x - start.x) || 1
		start.x = middle - halfSpan * direction
		end.x = middle + halfSpan * direction
	}
	const label = edgeLabels.get(svgEdge.id)
	const labelCenter = label && { x: label.x + label.w / 2, y: label.y + label.h / 2 }
	return {
		bend: getSelfLoopBend(svgEdge, labelCenter),
		anchorStartX: start.x,
		anchorStartY: start.y,
		anchorEndX: end.x,
		anchorEndY: end.y,
	}
}

// ---------------------------------------------------------------------------
// Layout scaling and bounds
// ---------------------------------------------------------------------------

export function scaleLayout(layout: ParsedDiagramLayout, scale: number): void {
	const { nodes, clusters, edges, edgeLabels } = layout
	for (const node of nodes.values()) {
		node.center.x *= scale
		node.center.y *= scale
		node.width *= scale
		node.height *= scale
	}
	for (const cluster of clusters.values()) {
		cluster.topLeft.x *= scale
		cluster.topLeft.y *= scale
		cluster.width *= scale
		cluster.height *= scale
	}
	for (const edge of edges) {
		for (const point of edge.points) {
			point.x *= scale
			point.y *= scale
		}
	}
	for (const label of edgeLabels.values()) {
		label.x *= scale
		label.y *= scale
		label.w *= scale
		label.h *= scale
	}
}
