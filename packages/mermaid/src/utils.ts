import type { MermaidBlueprintEdge, MermaidBlueprintNode } from './blueprint'

const BEND_SCALE = -1.8
const MAX_ARROW_BEND = 200

/**
 * Extrapolate a bend value for tldraw arrows from Mermaid edge path waypoints.
 * Uses perpendicular distance from chord to mid-points, scaled and clamped.
 */
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

export function getArrowBend(edgeData: { points: { x: number; y: number }[] }) {
	if (edgeData.points.length < 2) return 0
	const bend = getEdgeSagitta(edgeData.points) * BEND_SCALE
	return Math.max(-MAX_ARROW_BEND, Math.min(MAX_ARROW_BEND, bend))
}

/**
 * A self-loop's bend: out to the centre of mermaid's label, and never shallower than mermaid drew
 * the loop. tldraw sets an arrow's label on the middle of its arc, so reaching the label's centre is
 * what puts the text where mermaid did; a loop at mermaid's own depth centres it on the node's edge.
 * The amplification in {@link getArrowBend} is left out, as it suits a line between two shapes.
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
	return (reach ? toLabel : depth) * Math.sign(BEND_SCALE)
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
