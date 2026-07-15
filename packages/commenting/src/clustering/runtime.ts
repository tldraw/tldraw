import type { ClusterNode, ClusterTable, MergeEvent } from './types'

export interface ClusterRuntime {
	/** Events[0..k) are in the cursor (applied unless suppressed). Exposed for tests/debugging. */
	readonly k: number
	/**
	 * Increments whenever the displayed partition changes. Subscribe to this, not `k`: detaches
	 * and suppressed-event healing change the partition without moving the cursor.
	 */
	readonly version: number
	/** Number of suppressed band events currently inside the cursor. Exposed for tests. */
	getSuppressedCount(): number
	/** Number of leaves currently detached from the displayed partition. Exposed for tests. */
	getDetachedCount(): number
	/** Reset state from scratch for the given zoom (cold start / after rebuild). Clears detaches. */
	seed(zoom: number): void
	/**
	 * Reset state for the given zoom, carrying hysteresis state over from a previous partition
	 * (the visible map of the model being replaced). Threshold-forced events ignore history:
	 * zoom <= zMerge is always merged, zoom >= zSplit always split. An event inside its band
	 * keeps its previous state: merged iff its members were merged together in `previous`; a band
	 * event that was unmerged (or has no history, e.g. introduced by the rebuild) stays unmerged —
	 * inside the cursor but suppressed — until a zoom-out crosses its own zMerge, exactly like any
	 * other pending merge. Carryover is exact: no group changes state because of the swap alone.
	 * Clears detaches.
	 */
	seedFrom(zoom: number, previous: ReadonlyMap<string, ClusterNode>): void
	/** Advance/retreat the cursor for a camera change. No-op if zoom sits inside all bands. */
	onCamera(zoom: number): void
	/**
	 * Remove one leaf from the displayed partition without touching the event table. Local by
	 * construction: only the nodes containing the leaf change — a badge shrinks in place (count
	 * and centroid recomputed from its remaining members), a pair collapses to its surviving
	 * leaf, and the leaf on its own disappears. Everything else is untouched, so a deletion,
	 * pop-out, or thread-open never re-flows the rest of the document. The table's thresholds
	 * around the detached leaf go stale; the caller is expected to hold a corrected rebuild and
	 * adopt it (with seedFrom) at the next zoom-out. Unknown or already-detached ids are no-ops.
	 */
	detachLeaf(leafId: string): void
	/** The displayed partition: cluster id → node, with detaches applied. Do not mutate. */
	getVisible(): ReadonlyMap<string, ClusterNode>
}

export function createClusterRuntime(table: ClusterTable): ClusterRuntime {
	return new ClusterRuntimeImpl(table)
}

class ClusterRuntimeImpl implements ClusterRuntime {
	// mutable internally; readonly through the ClusterRuntime interface
	k = 0
	version = 0
	// Structural partition: exactly leaves + applied events, never patched. The cursor invariants
	// live here, untouched by detaches — resolution to the displayed partition happens at read
	// time in getVisible().
	private visible = new Map<string, ClusterNode>()
	private seeded = false
	// Indices (< k) of band events held unmerged by seedFrom carryover. The single cursor can
	// only express "merged up to here", but a carried-over partition can be "merged except these"
	// — the exceptions live here. Self-draining: an entry leaves via onCamera when the zoom
	// crosses its own zMerge (merges) or its zSplit (the split walk retreats past it).
	private suppressed = new Set<number>()
	// Leaves removed from the displayed partition (deleted / popped out / opened). Patches map
	// each structural node containing a detached leaf to its displayed replacement (or null to
	// drop it). Rebuilt from the detached set; cleared by seed/seedFrom.
	private detached = new Set<string>()
	private patched = new Map<string, ClusterNode | null>()
	private leafById: Map<string, ClusterNode> | null = null
	private resolvedCache: { version: number; map: Map<string, ClusterNode> } | null = null

	constructor(private readonly table: ClusterTable) {
		this.resetVisible()
	}

	getSuppressedCount(): number {
		return this.suppressed.size
	}

	getDetachedCount(): number {
		return this.detached.size
	}

	seed(zoom: number): void {
		validateZoom(zoom)
		this.k = seedCount(this.table.events, zoom)
		this.suppressed.clear()
		this.detached.clear()
		this.patched.clear()
		this.resetVisible()
		for (let i = 0; i < this.k; i++) {
			applyEvent(this.visible, this.table.events[i])
		}
		this.seeded = true
		this.version++
	}

	seedFrom(zoom: number, previous: ReadonlyMap<string, ClusterNode>): void {
		validateZoom(zoom)
		const ownerByMember = new Map<string, string>()
		for (const node of previous.values()) {
			for (const member of node.members) {
				ownerByMember.set(member, node.id)
			}
		}

		// Cut the cursor purely on split thresholds. zSplit is non-increasing down the table, so
		// everything past the first mandatory split (zoom >= zSplit) is also mandatorily split —
		// this cut can never conflict with an event that should be merged.
		const events = this.table.events
		let k = 0
		while (k < events.length && zoom < events[k].zSplit) {
			k++
		}

		this.k = k
		this.suppressed.clear()
		this.detached.clear()
		this.patched.clear()
		this.resetVisible()
		for (let i = 0; i < k; i++) {
			const event = events[i]
			if (zoom > event.zMerge && !wasMergedTogether(event.result.members, ownerByMember)) {
				// In its band and previously unmerged: keep it unmerged, as an exception inside
				// the cursor. Dependency-safe: an applied event can never consume a suppressed
				// result — merged members imply merged (subset) children, and threshold-forced
				// events force their children too (zMerge is non-increasing down the table).
				this.suppressed.add(i)
			} else {
				applyEvent(this.visible, event)
			}
		}
		this.seeded = true
		this.version++
	}

	onCamera(zoom: number): void {
		validateZoom(zoom)
		if (!this.seeded) {
			throw new Error('Cluster runtime must be seeded before onCamera')
		}

		let changed = false
		while (this.k < this.table.events.length && zoom <= this.table.events[this.k].zMerge) {
			applyEvent(this.visible, this.table.events[this.k])
			this.k++
			changed = true
		}
		while (this.k > 0 && zoom >= this.table.events[this.k - 1].zSplit) {
			this.k--
			// A suppressed event was never applied — retreating past it is bookkeeping only.
			if (!this.suppressed.delete(this.k)) {
				unapplyEvent(this.visible, this.table.events[this.k])
				changed = true
			}
		}
		// Heal suppressed events at their own merge threshold: a zoom-out past zMerge merges a
		// held-out band event exactly as if it had still been ahead of the cursor. Set iteration
		// is insertion order (ascending index), so a healed event's suppressed children (larger
		// zMerge, smaller index) always heal before it.
		if (this.suppressed.size > 0) {
			for (const i of [...this.suppressed]) {
				if (zoom <= this.table.events[i].zMerge) {
					this.suppressed.delete(i)
					applyEvent(this.visible, this.table.events[i])
					changed = true
				}
			}
		}
		if (changed) this.version++
	}

	detachLeaf(leafId: string): void {
		if (this.detached.has(leafId)) return
		if (!this.getLeafById().has(leafId)) return
		this.detached.add(leafId)
		this.rebuildPatches()
		this.version++
	}

	getVisible(): ReadonlyMap<string, ClusterNode> {
		if (this.resolvedCache && this.resolvedCache.version === this.version) {
			return this.resolvedCache.map
		}
		let map: Map<string, ClusterNode>
		if (this.patched.size === 0) {
			map = this.visible
		} else {
			map = new Map()
			for (const node of this.visible.values()) {
				const resolved = this.patched.has(node.id) ? this.patched.get(node.id)! : node
				if (resolved) map.set(resolved.id, resolved)
			}
		}
		this.resolvedCache = { version: this.version, map }
		return map
	}

	private getLeafById(): Map<string, ClusterNode> {
		if (!this.leafById) {
			this.leafById = new Map(this.table.leaves.map((leaf) => [leaf.id, leaf]))
		}
		return this.leafById
	}

	/** Recompute the patch map from the detached set. A node is patched iff it contains a
	 *  detached member; the patch drops those members and recomputes count/centroid, collapsing
	 *  to the surviving leaf node at count 1 and to nothing at count 0. Patched nodes keep their
	 *  structural id, so cursor events keep addressing them. */
	private rebuildPatches() {
		this.patched.clear()
		const leafById = this.getLeafById()
		for (const id of this.detached) {
			this.patched.set(id, null)
		}
		const patch = (node: ClusterNode) => {
			if (node.members.length === 1 || !node.members.some((m) => this.detached.has(m))) return
			const members = node.members.filter((m) => !this.detached.has(m))
			if (members.length === 0) {
				this.patched.set(node.id, null)
			} else if (members.length === 1) {
				this.patched.set(node.id, leafById.get(members[0])!)
			} else {
				let x = 0
				let y = 0
				for (const m of members) {
					const leaf = leafById.get(m)!
					x += leaf.centroid.x
					y += leaf.centroid.y
				}
				this.patched.set(node.id, {
					id: node.id,
					centroid: { x: x / members.length, y: y / members.length },
					count: members.length,
					members,
				})
			}
		}
		for (const event of this.table.events) {
			patch(event.result)
			for (const child of event.children) patch(child)
		}
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
