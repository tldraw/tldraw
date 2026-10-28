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
 * Claim the path the layout drew for an edge between two nodes, or undefined when nothing
 * matches. Each path is claimed at most once.
 *
 * A flowchart's paths carry the two node ids they join, in source order, so the nth edge between a
 * pair of nodes is the nth unclaimed path carrying their ids. Paths with no ids to go on, such as a
 * state diagram's `edge<N>`, fall back to whichever ends lie nearest the two node centers. That
 * fallback picks the wrong path when several ends sit equally close, which is what parallel edges
 * do (#10794).
 */
export function claimEdge(
	svgEdges: ParsedEdge[],
	claimed: Set<number>,
	edge: { startId: string; endId: string; startCenter?: Vec2; endCenter?: Vec2 }
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

	const { startCenter, endCenter } = edge
	if (!startCenter || !endCenter) return undefined

	let bestIndex = -1
	let bestDistance = Infinity
	for (let i = 0; i < svgEdges.length; i++) {
		if (!usable(svgEdges[i], i)) continue

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

/** How far from a node's corners an edge may slide along its side, as a fraction of that side. */
const EDGE_SLIDE_INSET = 0.1

/**
 * Bind an edge as an elbow arrow that follows the layout's route: it leaves and enters its shapes
 * where the route does, jogs where the route jogs, and carries its label where the layout put it.
 * Left to tldraw's defaults, neighbouring edges' jogs and labels land on top of each other.
 */
export function getElbowEdgeLayout(
	svgEdge: ParsedEdge,
	startBox: { x: number; y: number; w: number; h: number },
	endBox: { x: number; y: number; w: number; h: number },
	label?: ParsedEdgeLabel
) {
	const { points } = svgEdge
	if (points.length < 2) return undefined
	// The route stops short of a node by its arrowhead, so push its end out onto the nearest side.
	const toAnchor = (point: Vec2, box: { x: number; y: number; w: number; h: number }) => {
		const x = box.w > 0 ? clamp((point.x - box.x) / box.w, 0, 1) : 0.5
		const y = box.h > 0 ? clamp((point.y - box.y) / box.h, 0, 1) : 0.5
		const toSideX = Math.min(x, 1 - x) * box.w
		const toSideY = Math.min(y, 1 - y) * box.h
		return toSideY <= toSideX ? { x, y: Math.round(y) } : { x: Math.round(x), y }
	}
	const first = points[0]
	const last = points[points.length - 1]
	const start = toAnchor(first, startBox)
	const end = toAnchor(last, endBox)

	// Pele detours a labelled route through the label's slot, which a single-jog elbow would cut
	// across, piling labels together. Slide an end to line up with the label and jog on its far side.
	let throughLabel: { elbowMidPoint?: number; labelPosition: number } | undefined
	if (label) {
		const vertical = start.y === 0 || start.y === 1
		const across = (point: Vec2) => (vertical ? point.x : point.y)
		const along = (point: Vec2) => (vertical ? point.y : point.x)
		const center = { x: label.x + label.w / 2, y: label.y + label.h / 2 }
		const slide = (box: { x: number; y: number; w: number; h: number }) => {
			const t = vertical ? (center.x - box.x) / box.w : (center.y - box.y) / box.h
			return t >= EDGE_SLIDE_INSET && t <= 1 - EDGE_SLIDE_INSET ? t : undefined
		}
		const startSlide = slide(startBox)
		const endSlide = slide(endBox)
		const from = along(first)
		const to = along(last)
		const labelAlong = along(center)
		const labelHalf = (vertical ? label.h : label.w) / 2
		const between = (labelAlong - from) * (labelAlong - to) < 0
		const sameAxis = (end.y === 0 || end.y === 1) === vertical
		if (between && sameAxis && (startSlide !== undefined || endSlide !== undefined)) {
			const set = (anchor: { x: number; y: number }, t: number) =>
				vertical ? (anchor.x = t) : (anchor.y = t)
			if (startSlide !== undefined) set(start, startSlide)
			if (endSlide !== undefined) set(end, endSlide)
			const dir = Math.sign(to - from)
			// Jog halfway between the label and the end that could not line up with it.
			const jog =
				startSlide === undefined
					? (from + labelAlong - dir * labelHalf) / 2
					: endSlide === undefined
						? (to + labelAlong + dir * labelHalf) / 2
						: undefined
			const startAcross = startSlide !== undefined ? across(center) : across(first)
			const endAcross = endSlide !== undefined ? across(center) : across(last)
			const sideways = Math.abs(endAcross - startAcross)
			const total = Math.abs(to - from) + sideways
			const toLabel = Math.abs(labelAlong - from) + (startSlide === undefined ? sideways : 0)
			throughLabel = {
				elbowMidPoint: jog === undefined ? undefined : clamp((jog - from) / (to - from), 0, 1),
				labelPosition: total > 0 ? toLabel / total : 0.5,
			}
		}
	}

	return {
		kind: 'elbow' as const,
		bend: 0,
		anchorStartX: start.x,
		anchorStartY: start.y,
		anchorEndX: end.x,
		anchorEndY: end.y,
		isExact: false,
		isPrecise: true,
		...(throughLabel ?? {
			elbowMidPoint: getElbowMidPoint(points),
			labelPosition:
				label &&
				getPositionAlongRoute(points, { x: label.x + label.w / 2, y: label.y + label.h / 2 }),
		}),
	}
}

/**
 * Where a route's middle segment crosses between its ends, as tldraw's `elbowMidPoint` measures it:
 * the longest run across the direction the route leaves its start in.
 */
function getElbowMidPoint(points: Vec2[]): number | undefined {
	const first = points[0]
	const last = points[points.length - 1]
	const leavesVertically = Math.abs(points[1].y - first.y) >= Math.abs(points[1].x - first.x)
	const span = leavesVertically ? last.y - first.y : last.x - first.x
	if (Math.abs(span) < 1) return undefined

	let crossing: number | undefined
	let longest = 0
	for (let i = 1; i < points.length; i++) {
		const along = leavesVertically ? points[i].x - points[i - 1].x : points[i].y - points[i - 1].y
		const across = leavesVertically ? points[i].y - points[i - 1].y : points[i].x - points[i - 1].x
		if (Math.abs(across) > 1 || Math.abs(along) <= longest) continue
		longest = Math.abs(along)
		crossing = leavesVertically ? points[i].y : points[i].x
	}
	if (crossing === undefined) return undefined
	return clamp((crossing - (leavesVertically ? first.y : first.x)) / span, 0, 1)
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
