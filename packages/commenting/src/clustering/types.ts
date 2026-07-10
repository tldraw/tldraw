export interface Vec2 {
	x: number
	y: number
}

/** One comment thread's pin, already resolved to a page-space anchor point. */
export interface LeafInput {
	/** Unique. Thread id. Uniqueness is a precondition — throw on duplicates. */
	id: string
	/** Page-space coordinates. Must be finite — throw on NaN/Infinity. */
	point: Vec2
}

/** An edge of the Euclidean MST over the leaf anchor points. */
export interface MstEdge {
	/** Index into the input leaves array. Normalized: leaves[a].id < leaves[b].id (lexicographic). */
	a: number
	/** Index into the input leaves array. */
	b: number
	/** Exact Euclidean page-space distance between the two anchors. May be 0 (coincident). */
	d: number
}

/** A cluster in the merge tree: a leaf (one thread) or a merged group. */
export interface ClusterNode {
	/** Leaves: the thread id verbatim. Merged nodes: `cluster:${count}:${minMemberId}`. */
	id: string
	/** Page space; count-weighted mean of all member leaf anchors. */
	centroid: Vec2
	/** Number of member leaves. Leaves = 1. */
	count: number
	/** All member thread ids, sorted lexicographically ascending. */
	members: string[]
}

/** One merge produced by the capped replay, before contraction. */
export interface RawMergeEvent {
	/** Effective merge threshold zEff = min(Tc/d, Dmax/unionBboxDiag). +Infinity for coincident anchors. */
	z: number
	/** The two clusters consumed, ordered by ascending min-member id. */
	children: [ClusterNode, ClusterNode]
	/** The cluster produced. */
	result: ClusterNode
}

/** A merge event after contraction: possibly multi-way, before hysteresis. */
export interface ContractedEvent {
	/** Fires (merges) when zoom <= zMerge. May be +Infinity. */
	zMerge: number
	/** Clusters consumed — 2 or more, ordered by ascending min-member id. */
	children: ClusterNode[]
	/** Cluster produced. */
	result: ClusterNode
}

/** A finalized merge event, ready for the runtime. */
export interface MergeEvent {
	zMerge: number
	/** Reverses (splits) when zoom >= zSplit. Always > zMerge. May be +Infinity. */
	zSplit: number
	children: ClusterNode[]
	result: ClusterNode
}

/** The precomputed clustering schedule for one page's comments. */
export interface ClusterTable {
	/** Sorted non-increasing by zMerge; satisfies the invariants of CLUSTERING.md §7.6. */
	events: readonly MergeEvent[]
	/** One node per input leaf, in input order. */
	leaves: readonly ClusterNode[]
}

export interface ClusterOptions {
	/** Cluster (merge) distance, screen px. Default 40. */
	Tc?: number
	/** Uncluster (split) distance, screen px. Must be > Tc. Default 1.5 · Tc. */
	Tu?: number
	/** Contraction window ratio. Default 0.12. */
	eps?: number
	/** Max cluster screen extent at birth, screen px. Must be >= Tc. Default 3 · Tc. */
	Dmax?: number
	/** Camera zoom bounds — pass the editor's camera constraints. Required. */
	minZoom: number
	maxZoom: number
	/**
	 * Zoom by which every cluster has split, no matter how close its members are — including
	 * coincident anchors, which otherwise never split. Merge thresholds are capped at
	 * `maxSplitZoom / (Tu/Tc)` so the hysteresis band keeps its shape below the cap.
	 * Default 6 (600%).
	 */
	maxSplitZoom?: number
}
