/**
 * Lightweight mermaid detection replicating mermaid's own detectType preprocessing
 * (from mermaid v11.12.2 src/diagram-api/detectType.ts and src/diagram-api/regexes.ts).
 * Strips YAML frontmatter, %%{...}%% directives, and %% comments, then tests for
 * a known diagram keyword at the start of the cleaned text.
 */
const FRONTMATTER_REGEX = /^-{3}\s*[\n\r]([\s\S]*?)[\n\r]-{3}\s*[\n\r]+/
const DIRECTIVE_REGEX =
	/%{2}{\s*(?:(\w+)\s*:|(\w+))\s*(?:(\w+)|((?:(?!}%{2}).|\r?\n)*))?\s*(?:}%{2})?/gi
const COMMENT_REGEX = /\s*%%.*\n/gm
const DIAGRAM_KEYWORD_REGEX =
	/^\s*(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|gitGraph|mindmap|timeline|sankey|xychart|block|quadrantChart|requirement|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment|packet|kanban|architecture|treemap|radar|info)/

/** @public */
export function simpleMermaidStringTest(text: string): boolean {
	const cleaned = text
		.replace(FRONTMATTER_REGEX, '')
		.replace(DIRECTIVE_REGEX, '')
		.replace(COMMENT_REGEX, '\n')
	return DIAGRAM_KEYWORD_REGEX.test(cleaned)
}

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
	return text
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/&lt;/gi, '<')
		.replace(/&gt;/gi, '>')
		.replace(/&amp;/gi, '&')
		.replace(/&quot;/gi, '"')
		.replace(/&#39;/gi, "'")
		.trim()
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
