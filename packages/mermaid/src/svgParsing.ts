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
	/** The label's lines, broken where the layout wrapped them. */
	lines?: string[]
}

export interface ParsedCluster {
	id: string
	topLeft: Vec2
	width: number
	height: number
}

export interface ParsedEdge {
	/** The path's `data-id`, shared with the edge's label in the SVG. */
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
	/** The label's lines, broken where the layout wrapped them. */
	lines?: string[]
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

export function parseTranslate(attr: string | null): Vec2 {
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

export interface LayoutBox {
	x: number
	y: number
	w: number
	h: number
}

/** A node or cluster's box in the layout. */
export function getLayoutBox(layout: ParsedDiagramLayout, id: string): LayoutBox | undefined {
	const node = layout.nodes.get(id)
	if (node) {
		return {
			x: node.center.x - node.width / 2,
			y: node.center.y - node.height / 2,
			w: node.width,
			h: node.height,
		}
	}
	const cluster = layout.clusters.get(id)
	return (
		cluster && { x: cluster.topLeft.x, y: cluster.topLeft.y, w: cluster.width, h: cluster.height }
	)
}

function getDistanceToBox(point: Vec2, box: LayoutBox) {
	const dx = Math.max(box.x - point.x, 0, point.x - (box.x + box.w))
	const dy = Math.max(box.y - point.y, 0, point.y - (box.y + box.h))
	return Math.hypot(dx, dy)
}

/**
 * Claim the path the layout drew for an edge between two nodes, or undefined when nothing
 * matches. Each path is claimed at most once.
 *
 * A flowchart's paths carry the two node ids they join, in source order, so the nth edge between a
 * pair of nodes is the nth unclaimed path carrying their ids. Paths with no ids to go on, such as a
 * state diagram's `edge<N>`, fall back to whichever ends lie nearest the two nodes' boxes. Nearest
 * the boxes rather than their centres, or a tall node's self-loop claims a path leaving the node,
 * whose start is nearer the centre than the loop's ends at the node's side. That fallback picks
 * the wrong path when several ends sit equally close, which is what parallel edges do (#10794).
 */
export function claimEdge(
	svgEdges: ParsedEdge[],
	claimed: Set<number>,
	edge: { startId: string; endId: string; startBox?: LayoutBox; endBox?: LayoutBox }
): ParsedEdge | undefined {
	const usable = (svgEdge: ParsedEdge, index: number) =>
		!claimed.has(index) && svgEdge.points.length >= 2

	if (edge.startId && edge.endId) {
		const byId = svgEdges.findIndex(
			(svgEdge, index) =>
				usable(svgEdge, index) && svgEdge.start === edge.startId && svgEdge.end === edge.endId
		)
		if (byId >= 0) {
			claimed.add(byId)
			return svgEdges[byId]
		}
	}

	const { startBox, endBox } = edge
	if (!startBox || !endBox) return undefined

	let bestIndex = -1
	let bestDistance = Infinity
	for (let i = 0; i < svgEdges.length; i++) {
		if (!usable(svgEdges[i], i)) continue

		const points = svgEdges[i].points
		const last = points[points.length - 1]
		const distance = getDistanceToBox(points[0], startBox) + getDistanceToBox(last, endBox)
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
 * Where a self-loop leaves and re-enters its node, and how far out it reaches, following the side
 * the layout looped out of, with the label just beyond.
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

/** How far from a route's end toward its node's centre an arrow aims, as a share of the way. */
const ANCHOR_INSET = 0.25

/**
 * Where an arrow should leave and enter its shapes: where the layout's route does, as a fraction of
 * each end's box in the layout. Bound to shape centres instead, the edges of a split or merge all
 * aim for the same point and pinch together; the layout gives each its own place on the side.
 * Fractions of the layout's box carry over to a shape drawn wider than it, such as a join bar.
 */
export function getRouteEndAnchors(svgEdge: ParsedEdge, startBox: LayoutBox, endBox: LayoutBox) {
	const { points } = svgEdge
	if (points.length < 2) return undefined
	// The route stops just outside a node's outline. Aim a quarter of the way in from there, so
	// tldraw clips the arrow at the drawn outline whatever the shape: a point on the box's side
	// would sit outside a diamond or circle.
	const toAnchor = (point: Vec2, box: LayoutBox) => {
		const x = box.w > 0 ? clamp((point.x - box.x) / box.w, 0, 1) : 0.5
		const y = box.h > 0 ? clamp((point.y - box.y) / box.h, 0, 1) : 0.5
		return { x: x + (0.5 - x) * ANCHOR_INSET, y: y + (0.5 - y) * ANCHOR_INSET }
	}
	const start = toAnchor(points[0], startBox)
	const end = toAnchor(points[points.length - 1], endBox)
	return {
		anchorStartX: start.x,
		anchorStartY: start.y,
		anchorEndX: end.x,
		anchorEndY: end.y,
		isExact: false,
		isPrecise: true,
	}
}

/** How far along a route the point nearest `target` lies, as a fraction of the route's length. */
export function getPositionAlongRoute(points: Vec2[], target: Vec2): number | undefined {
	let total = 0
	let best = { distance: Infinity, at: 0 }
	for (let i = 1; i < points.length; i++) {
		const a = points[i - 1]
		const b = points[i]
		const length = Math.hypot(b.x - a.x, b.y - a.y)
		const t = length
			? clamp(((target.x - a.x) * (b.x - a.x) + (target.y - a.y) * (b.y - a.y)) / length ** 2, 0, 1)
			: 0
		const distance = Math.hypot(a.x + (b.x - a.x) * t - target.x, a.y + (b.y - a.y) * t - target.y)
		if (distance < best.distance) best = { distance, at: total + length * t }
		total += length
	}
	return total > 0 ? best.at / total : undefined
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
