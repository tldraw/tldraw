const BEND_SCALE = -1.8
const MAX_ARROW_BEND = 200

/**
 * Extrapolate a bend value for tldraw arrows from Mermaid edge path waypoints.
 * Uses perpendicular distance from chord to mid-points, scaled and clamped.
 */
export function getArrowBend(edgeData: { points: { x: number; y: number }[] }) {
	const points = edgeData.points

	if (points.length < 2) {
		return 0
	}

	const start = points[0]
	const end = points[points.length - 1]
	const dx = end.x - start.x
	const dy = end.y - start.y
	const chordLength = Math.sqrt(dx * dx + dy * dy)

	if (chordLength === 0) return 0

	let maxDistance = 0
	for (let i = 1; i < points.length - 1; i++) {
		const distance = ((points[i].x - start.x) * dy - (points[i].y - start.y) * dx) / chordLength
		if (Math.abs(distance) > Math.abs(maxDistance)) {
			maxDistance = distance
		}
	}

	const bend = maxDistance * BEND_SCALE
	return Math.max(-MAX_ARROW_BEND, Math.min(MAX_ARROW_BEND, bend))
}

/** Normalize HTML line breaks to newlines, decode HTML entities, and trim. */
export function sanitizeDiagramText(text: string): string {
	if (typeof text !== 'string') return ''
	const doc = new DOMParser().parseFromString(text.replace(/<br\s*\/?>/gi, '\n'), 'text/html')
	return (doc.body.textContent ?? '').trim()
}

/** Scale factor applied to parsed SVG layout (nodes, clusters, edges). */
export const LAYOUT_SCALE = 1.25

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
