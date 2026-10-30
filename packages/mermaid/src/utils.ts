import type { MermaidBlueprintEdge, MermaidBlueprintNode } from './blueprint'

/** Signed perpendicular distance from the chord between `points`' two ends to `point`. */
function getChordOffset(points: { x: number; y: number }[], point: { x: number; y: number }) {
	const start = points[0]
	const end = points[points.length - 1]
	const dx = end.x - start.x
	const dy = end.y - start.y
	const chordLength = Math.sqrt(dx * dx + dy * dy)
	if (chordLength === 0) return 0
	return ((point.x - start.x) * dy - (point.y - start.y) * dx) / chordLength
}

/** Signed perpendicular distance from an edge's chord to its farthest routing point. */
function getEdgeSagitta(points: { x: number; y: number }[]) {
	let maxDistance = 0
	for (let i = 1; i < points.length - 1; i++) {
		const distance = getChordOffset(points, points[i])
		if (Math.abs(distance) > Math.abs(maxDistance)) {
			maxDistance = distance
		}
	}
	return maxDistance
}

/**
 * The bend of an arrow from `start` to `end` that follows the layout's route as far as one arc can:
 * an arc enclosing the same area against its chord, scaled to the arrow's length.
 *
 * A layered layout leaves and enters nodes along the flow, so a route between nodes that aren't
 * lined up is an S, which no single arc can follow. Its two halves cancel, so the arrow is drawn
 * straight; a route that detours around other nodes, or one of several edges between two nodes,
 * keeps its curve. Taking the route's farthest point as the arc's depth bows an S out to one side,
 * through its own label.
 */
export function getRouteArcBend(
	points: { x: number; y: number }[],
	startNode: MermaidBlueprintNode | undefined,
	endNode: MermaidBlueprintNode | undefined,
	anchors: { anchorStartX: number; anchorStartY: number; anchorEndX: number; anchorEndY: number }
) {
	const first = points[0]
	const last = points[points.length - 1]
	if (!startNode || !endNode || points.length < 3) return 0
	const routeLength = Math.hypot(last.x - first.x, last.y - first.y)
	const arrowLength = Math.hypot(
		endNode.x + anchors.anchorEndX * endNode.w - (startNode.x + anchors.anchorStartX * startNode.w),
		endNode.y + anchors.anchorEndY * endNode.h - (startNode.y + anchors.anchorStartY * startNode.h)
	)
	if (routeLength === 0) return 0
	// Signed area between the route and its chord: an S's two halves cancel, a detour's doesn't.
	let area = 0
	for (let i = 1; i < points.length - 1; i++) {
		const a = points[i]
		const b = points[i + 1]
		area += ((a.x - first.x) * (b.y - first.y) - (a.y - first.y) * (b.x - first.x)) / 2
	}
	// An arc's area is two thirds of its chord times its depth. tldraw bends an arrow to the side
	// opposite the chord offset's sign.
	const depth = (1.5 * area) / routeLength
	return (-depth * arrowLength) / routeLength
}

/**
 * A self-loop's bend: out to the centre of the layout's label, and never shallower than the layout
 * drew the loop. tldraw sets an arrow's label on the middle of its arc, so reaching the label's
 * centre is what puts the text where the layout did; a loop at the layout's own depth centres it on
 * the node's edge.
 */
export function getSelfLoopBend(
	edgeData: { points: { x: number; y: number }[] },
	labelCenter?: { x: number; y: number }
) {
	if (edgeData.points.length < 2) return 0
	const depth = getEdgeSagitta(edgeData.points)
	const toLabel = labelCenter ? getChordOffset(edgeData.points, labelCenter) : 0
	// A label on the far side of the chord would pull the loop into the node.
	const reach = Math.sign(toLabel) === Math.sign(depth) && Math.abs(toLabel) > Math.abs(depth)
	// tldraw bends an arrow to the side opposite the chord offset's sign.
	return -(reach ? toLabel : depth)
}

/** Normalize HTML line breaks to newlines, decode HTML entities, and trim. */
export function sanitizeDiagramText(text: string): string {
	if (typeof text !== 'string') return ''
	const doc = new DOMParser().parseFromString(text.replace(/<br\s*\/?>/gi, '\n'), 'text/html')
	return (doc.body.textContent ?? '').trim()
}

/** Scale factor applied to parsed SVG layout (nodes, clusters, edges). */
export const LAYOUT_SCALE = 1.25

export function dropDanglingEdges(
	nodes: MermaidBlueprintNode[],
	edges: MermaidBlueprintEdge[]
): MermaidBlueprintEdge[] {
	const nodeIds = new Set(nodes.map((n) => n.id))
	return edges.filter((e) => nodeIds.has(e.startNodeId) && nodeIds.has(e.endNodeId))
}

/**
 * Order items top-down by parent relationship so parents are visited before children.
 * Works for subgraphs (FlowSubGraph[]) and compound state IDs (string[]).
 */
export function orderTopDown<T>(
	items: T[],
	getId: (item: T) => string,
	getParentId: (item: T) => string | undefined
): T[] {
	const byId = new Map(items.map((item) => [getId(item), item]))
	const visited = new Set<string>()
	const result: T[] = []

	function visit(id: string) {
		if (visited.has(id)) return
		visited.add(id)
		const item = byId.get(id)
		if (item) result.push(item)
		for (const child of items) {
			if (getParentId(child) === id) visit(getId(child))
		}
	}

	for (const item of items) {
		const parentId = getParentId(item)
		if (!parentId || !byId.has(parentId)) visit(getId(item))
	}
	return result
}
