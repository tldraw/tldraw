/**
 * Parse a strictly linear Mermaid flowchart into an ordered list of node ids.
 *
 * Supported:
 * - Chained edges on one line or split across lines (`a --> b --> c`).
 * - Edge labels with pipes (`-->|label|`) — label segments are stripped before reading ids.
 * - Text between dashes (`A -- label --> B`) normalized to `A --> B`.
 *
 * Rejected: branches, merges, cycles, or disconnected components (anything that is not one simple path).
 */

const ID_START = /^([a-zA-Z_][a-zA-Z0-9_]*)/

/** Split on `-->` optionally followed by `|edge label|`. */
const ARROW_SPLIT = /-->(?:\|[^|]*\|)?/g

/** Turns `B -- Yes --> C` into `B --> C` so the arrow splitter can run. */
function normalizeTextLabeledArrows(line: string): string {
	return line.replace(/--\s+[^-\n]+?\s*-->/g, '-->')
}

function extractLeadingId(segment: string): string | null {
	const t = segment.trim()
	const m = t.match(ID_START)
	return m ? m[1] : null
}

function extractEdgePairsFromLine(line: string): [string, string][] {
	const parts = line.split(ARROW_SPLIT)
	const ids: string[] = []
	for (const part of parts) {
		const id = extractLeadingId(part)
		if (id) ids.push(id)
	}
	const pairs: [string, string][] = []
	for (let i = 0; i < ids.length - 1; i++) {
		pairs.push([ids[i], ids[i + 1]])
	}
	return pairs
}

/**
 * If edges form one directed path covering all nodes, returns vertex order from start to end.
 * Otherwise null (branch: two successors; merge: two predecessors; cycle; unreachable node).
 */
function buildLinearOrder(edges: [string, string][]): string[] | null {
	if (edges.length === 0) return null

	const succ = new Map<string, string>()
	const pred = new Map<string, string>()
	const all = new Set<string>()

	for (const [a, b] of edges) {
		all.add(a)
		all.add(b)
		if (succ.has(a) && succ.get(a) !== b) {
			return null
		}
		succ.set(a, b)
		if (pred.has(b) && pred.get(b) !== a) {
			return null
		}
		pred.set(b, a)
	}

	const starts = [...all].filter((n) => !pred.has(n))
	const ends = [...all].filter((n) => !succ.has(n))
	if (starts.length !== 1 || ends.length !== 1) {
		return null
	}

	const order: string[] = []
	const visited = new Set<string>()
	let cur: string | undefined = starts[0]

	while (cur !== undefined) {
		if (visited.has(cur)) {
			return null
		}
		visited.add(cur)
		order.push(cur)
		cur = succ.get(cur)
	}

	if (order.length !== all.size) {
		return null
	}
	return order
}

export type ParseLinearPipelineResult = { ok: true; order: string[] } | { ok: false; error: string }

/** Ordered ids from start to end, or a user-facing error string. */
export function parseLinearPipelineFromMermaid(text: string): ParseLinearPipelineResult {
	const lines = text
		.split('\n')
		.map((l) => l.trim())
		.filter((l) => l.length > 0 && !l.startsWith('%%'))

	const pairs: [string, string][] = []
	for (const line of lines) {
		if (/^flowchart\s+/i.test(line)) continue
		if (line.startsWith('subgraph') || line === 'end') continue
		const normalized = normalizeTextLabeledArrows(line)
		if (!normalized.includes('-->')) continue
		pairs.push(...extractEdgePairsFromLine(normalized))
	}

	if (pairs.length === 0) {
		return { ok: false, error: 'No steps found. Use a linear flowchart, e.g. a --> b --> c.' }
	}

	const order = buildLinearOrder(pairs)
	if (!order) {
		return {
			ok: false,
			error:
				'Not a single sequential path. This example needs one straight pipeline (no branches or joins).',
		}
	}

	return { ok: true, order }
}
