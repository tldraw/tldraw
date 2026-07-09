import type { ClusterNode, ClusterTable, MergeEvent } from './types'

export interface ClusterRuntime {
	/** Events[0..k) are active. Exposed for tests and debugging. */
	readonly k: number
	/** Reset state from scratch for the given zoom (cold start / after rebuild). */
	seed(zoom: number): void
	/** Advance/retreat the cursor for a camera change. No-op if zoom sits inside all bands. */
	onCamera(zoom: number): void
	/** The current partition: cluster id → node. Do not mutate. */
	getVisible(): ReadonlyMap<string, ClusterNode>
}

export function createClusterRuntime(table: ClusterTable): ClusterRuntime {
	return new ClusterRuntimeImpl(table)
}

class ClusterRuntimeImpl implements ClusterRuntime {
	// mutable internally; readonly through the ClusterRuntime interface
	k = 0
	private visible = new Map<string, ClusterNode>()
	private seeded = false

	constructor(private readonly table: ClusterTable) {
		this.resetVisible()
	}

	seed(zoom: number): void {
		validateZoom(zoom)
		this.k = seedCount(this.table.events, zoom)
		this.resetVisible()
		for (let i = 0; i < this.k; i++) {
			applyEvent(this.visible, this.table.events[i])
		}
		this.seeded = true
	}

	onCamera(zoom: number): void {
		validateZoom(zoom)
		if (!this.seeded) {
			throw new Error('Cluster runtime must be seeded before onCamera')
		}

		while (this.k < this.table.events.length && zoom <= this.table.events[this.k].zMerge) {
			applyEvent(this.visible, this.table.events[this.k])
			this.k++
		}
		while (this.k > 0 && zoom >= this.table.events[this.k - 1].zSplit) {
			this.k--
			unapplyEvent(this.visible, this.table.events[this.k])
		}
	}

	getVisible(): ReadonlyMap<string, ClusterNode> {
		return this.visible
	}

	private resetVisible() {
		this.visible = new Map()
		for (const leaf of this.table.leaves) {
			this.visible.set(leaf.id, leaf)
		}
	}
}

function seedCount(events: readonly MergeEvent[], zoom: number): number {
	let lo = 0
	let hi = events.length
	while (lo < hi) {
		const mid = (lo + hi) >> 1
		if (zoom <= seedThreshold(events[mid])) {
			lo = mid + 1
		} else {
			hi = mid
		}
	}
	return lo
}

function seedThreshold(event: MergeEvent): number {
	return Math.sqrt(event.zMerge * event.zSplit)
}

function applyEvent(visible: Map<string, ClusterNode>, event: MergeEvent) {
	for (const child of event.children) {
		visible.delete(child.id)
	}
	visible.set(event.result.id, event.result)
}

function unapplyEvent(visible: Map<string, ClusterNode>, event: MergeEvent) {
	visible.delete(event.result.id)
	for (const child of event.children) {
		visible.set(child.id, child)
	}
}

function validateZoom(zoom: number) {
	if (!Number.isFinite(zoom) || zoom <= 0) {
		throw new Error('zoom must be finite and greater than 0')
	}
}
