import type { ClusterNode, ContractedEvent, MergeEvent, RawMergeEvent } from './types'

export function contract(raw: readonly RawMergeEvent[], eps: number): ContractedEvent[] {
	if (!Number.isFinite(eps) || eps < 0) {
		throw new Error('eps must be finite and greater than or equal to 0')
	}

	const out: ContractedEvent[] = []
	let i = 0
	while (i < raw.length) {
		const anchor = raw[i].z
		let j = i
		while (j + 1 < raw.length && raw[j + 1].z >= anchor / (1 + eps)) {
			j++
		}

		const chains = contractWindow(raw.slice(i, j + 1), anchor)
		out.push(...chains)
		i = j + 1
	}

	return out
}

export function finalize(
	events: readonly ContractedEvent[],
	opts: { Tc: number; Tu: number; minZoom: number; maxZoom: number; maxSplitZoom: number }
): MergeEvent[] {
	validateFinalizeOptions(opts)

	const r = opts.Tu / opts.Tc
	// Every cluster must have split by maxSplitZoom, however close (or coincident) its members.
	// Capping zMerge at maxSplitZoom / r keeps the whole band below the cap, preserving
	// zSplit > zMerge and the table's sort order (min with a constant is order-preserving).
	const zMergeCap = opts.maxSplitZoom / r
	const out: MergeEvent[] = []
	for (const event of events) {
		const zMerge = Math.min(event.zMerge, zMergeCap)
		if (zMerge < opts.minZoom) break
		let zSplit = zMerge * r
		if (zMerge < opts.maxZoom) {
			zSplit = Math.min(zSplit, opts.maxZoom)
		}
		out.push({
			zMerge,
			zSplit,
			children: event.children,
			result: event.result,
		})
	}
	return out
}

function contractWindow(events: readonly RawMergeEvent[], zMerge: number): ContractedEvent[] {
	const uf = new ComponentUnionFind(events.length)
	const resultToIndex = new Map<string, number>()
	for (let i = 0; i < events.length; i++) {
		resultToIndex.set(events[i].result.id, i)
	}

	for (let i = 0; i < events.length; i++) {
		for (const child of events[i].children) {
			const producer = resultToIndex.get(child.id)
			if (producer !== undefined) {
				uf.union(i, producer)
			}
		}
	}

	const byRoot = new Map<number, number[]>()
	for (let i = 0; i < events.length; i++) {
		const root = uf.find(i)
		const list = byRoot.get(root)
		if (list) {
			list.push(i)
		} else {
			byRoot.set(root, [i])
		}
	}

	return Array.from(byRoot.values())
		.map((indices) => contractChain(events, indices, zMerge))
		.sort((a, b) => compareNodesByMinMember(a.result, b.result))
}

function contractChain(
	events: readonly RawMergeEvent[],
	indices: readonly number[],
	zMerge: number
): ContractedEvent {
	const produced = new Set<string>()
	const consumedProduced = new Set<string>()
	for (const index of indices) {
		produced.add(events[index].result.id)
	}
	for (const index of indices) {
		for (const child of events[index].children) {
			if (produced.has(child.id)) consumedProduced.add(child.id)
		}
	}

	const childrenById = new Map<string, ClusterNode>()
	for (const index of indices) {
		for (const child of events[index].children) {
			if (!produced.has(child.id)) childrenById.set(child.id, child)
		}
	}

	let result: ClusterNode | undefined
	for (const index of indices) {
		const candidate = events[index].result
		if (!consumedProduced.has(candidate.id)) {
			if (!result || compareNodesByMinMember(candidate, result) < 0) result = candidate
		}
	}

	return {
		zMerge,
		children: Array.from(childrenById.values()).sort(compareNodesByMinMember),
		result: result!,
	}
}

function validateFinalizeOptions(opts: {
	Tc: number
	Tu: number
	minZoom: number
	maxZoom: number
	maxSplitZoom: number
}) {
	if (!Number.isFinite(opts.maxSplitZoom) || opts.maxSplitZoom <= 0) {
		throw new Error('maxSplitZoom must be finite and greater than 0')
	}
	if (!Number.isFinite(opts.Tc) || opts.Tc <= 0) {
		throw new Error('Tc must be finite and greater than 0')
	}
	if (!Number.isFinite(opts.Tu) || opts.Tu <= opts.Tc) {
		throw new Error('Tu must be finite and greater than Tc')
	}
	if (!Number.isFinite(opts.minZoom) || opts.minZoom <= 0) {
		throw new Error('minZoom must be finite and greater than 0')
	}
	if (!Number.isFinite(opts.maxZoom) || opts.maxZoom <= opts.minZoom) {
		throw new Error('maxZoom must be finite and greater than minZoom')
	}
}

function compareNodesByMinMember(a: ClusterNode, b: ClusterNode): number {
	const aMin = a.members[0]
	const bMin = b.members[0]
	if (aMin < bMin) return -1
	if (aMin > bMin) return 1
	return 0
}

class ComponentUnionFind {
	private readonly parent: Int32Array

	constructor(n: number) {
		this.parent = new Int32Array(n)
		for (let i = 0; i < n; i++) {
			this.parent[i] = i
		}
	}

	find(index: number): number {
		let root = index
		while (this.parent[root] !== root) {
			root = this.parent[root]
		}
		while (this.parent[index] !== index) {
			const next = this.parent[index]
			this.parent[index] = root
			index = next
		}
		return root
	}

	union(a: number, b: number) {
		const rootA = this.find(a)
		const rootB = this.find(b)
		if (rootA !== rootB) this.parent[rootB] = rootA
	}
}
