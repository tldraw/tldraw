import type { ClusterNode, ClusterTable, MergeEvent } from './types'

export interface ClusterRuntime {
	/** Events[0..k) are active. Exposed for tests and debugging. */
	readonly k: number
	/** Reset state from scratch for the given zoom (cold start / after rebuild). */
	seed(zoom: number): void
	/**
	 * Reset state for the given zoom, carrying hysteresis state over from a previous partition
	 * (the visible map of the model being replaced). Threshold-forced events ignore history:
	 * zoom <= zMerge is always active, zoom >= zSplit always inactive. An event inside its band
	 * is active iff its members were merged together in `previous`; a band event with no history
	 * (e.g. introduced by the rebuild) stays inactive until the next zoom-out crosses its zMerge.
	 * Active events must form a prefix of the table, so classification stops at the first
	 * inactive event; later band-active events conservatively resolve to split.
	 */
	seedFrom(zoom: number, previous: ReadonlyMap<string, ClusterNode>): void
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

	seedFrom(zoom: number, previous: ReadonlyMap<string, ClusterNode>): void {
		validateZoom(zoom)
		const ownerByMember = new Map<string, string>()
		for (const node of previous.values()) {
			for (const member of node.members) {
				ownerByMember.set(member, node.id)
			}
		}

		const events = this.table.events
		let k = 0
		while (k < events.length) {
			const event = events[k]
			if (zoom >= event.zSplit) break
			if (zoom > event.zMerge && !wasMergedTogether(event.result.members, ownerByMember)) break
			k++
		}

		this.k = k
		this.resetVisible()
		for (let i = 0; i < k; i++) {
			applyEvent(this.visible, events[i])
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

/** True iff every member id belonged to the same node of the previous partition. */
function wasMergedTogether(
	members: readonly string[],
	ownerByMember: ReadonlyMap<string, string>
): boolean {
	const owner = ownerByMember.get(members[0])
	if (owner === undefined) return false
	for (let i = 1; i < members.length; i++) {
		if (ownerByMember.get(members[i]) !== owner) return false
	}
	return true
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
