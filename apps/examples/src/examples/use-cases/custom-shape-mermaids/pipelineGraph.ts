export type ParseFlowchartPipelineResult =
	| {
			ok: true
			nodeIds: string[]
			edges: [string, string][]
			stepIndexByNodeId: Record<string, number>
	  }
	| { ok: false; error: string }

const ERR_NO_STEPS =
	'No pipeline edges found between steps. Add arrows between nodes, e.g. a --> b --> c.'
const ERR_CYCLE = 'The flowchart has a cycle. This demo only supports directed acyclic graphs.'

/** Build predecessor lists: node id -> list of parents (from directed edges). */
export function predecessorsFromEdges(edges: [string, string][]): Map<string, string[]> {
	const m = new Map<string, string[]>()
	for (const [a, b] of edges) {
		let ps = m.get(b)
		if (!ps) {
			ps = []
			m.set(b, ps)
		}
		ps.push(a)
	}
	return m
}

/**
 * Validate edges form a DAG; assign a 1-based Kahn "layer" per node (same wave = same badge number).
 */
function dagLayersFromEdges(
	edges: [string, string][],
	nodes: Set<string>
): { ok: true; stepIndexByNodeId: Record<string, number> } | { ok: false; error: string } {
	const nodeList = [...nodes]
	const outgoing = new Map<string, string[]>()
	const indeg = new Map<string, number>()
	for (const n of nodeList) {
		outgoing.set(n, [])
		indeg.set(n, 0)
	}
	for (const [u, v] of edges) {
		outgoing.get(u)!.push(v)
		indeg.set(v, (indeg.get(v) ?? 0) + 1)
	}

	const indegWork = new Map(indeg)
	const stepIndexByNodeId: Record<string, number> = {}
	let layer = 0
	let remaining = nodeList.length

	while (remaining > 0) {
		const sources = nodeList.filter((n) => (indegWork.get(n) ?? 0) === 0)
		if (sources.length === 0) {
			return { ok: false, error: ERR_CYCLE }
		}
		layer++
		sources.sort()
		for (const u of sources) {
			stepIndexByNodeId[u] = layer
			indegWork.set(u, -1)
			remaining--
			for (const v of outgoing.get(u) ?? []) {
				const d = indegWork.get(v) ?? 0
				if (d >= 0) indegWork.set(v, d - 1)
			}
		}
	}

	return { ok: true, stepIndexByNodeId }
}

export function flowchartPipelineFromEdges(
	pairs: [string, string][]
): ParseFlowchartPipelineResult {
	if (pairs.length === 0) {
		return { ok: false, error: ERR_NO_STEPS }
	}

	const nodes = new Set<string>()
	for (const [a, b] of pairs) {
		nodes.add(a)
		nodes.add(b)
	}

	const layered = dagLayersFromEdges(pairs, nodes)
	if (!layered.ok) {
		return layered
	}

	const nodeIds = [...nodes].sort()
	return {
		ok: true,
		nodeIds,
		edges: pairs,
		stepIndexByNodeId: layered.stepIndexByNodeId,
	}
}
