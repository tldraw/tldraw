# Clustering implementation steps

Build plan for the algorithm specified in `CLUSTERING.md`. Each step is a
self-contained brief for a builder: read `CLUSTERING.md` plus the step section,
implement exactly the interface given, and do NOT write test files — the
canonical tests are authored separately against these contracts. Self-verify
however you like, but don't commit scratch code. If you are tempted to deviate
from any clause, implement the contract anyway and report the temptation — that
is where the extra tests will go.

Shared rules for every step:

- Pure TypeScript in `packages/commenting/src/clustering/`. No imports from
  `tldraw`, `@tldraw/editor`, or React (exception: step 6, the overlay wiring).
- Named exports only. No randomness, no `Date.now()`, no global state, no input
  mutation. Follow existing repo style (tabs, sentence-case comments).
- Do not add anything to `index.ts` / `canvas.ts` barrels until step 6.
- Determinism is a hard requirement everywhere: identical input ⇒ identical
  output; permuted input arrays ⇒ identical output up to documented index
  remapping. All tie-breaks key on **ids, never array indices**.

Step status:

- [x] Step 1 — `types.ts` + `mstEdges` (built; 25 tests passing in `mst.test.ts`)
- [x] Step 2 — capped replay (`replay.ts`; 24 tests passing in `replay.test.ts`)
- [x] Step 3 — contraction + finalize (`schedule.ts`; 28 tests passing in
      `schedule.test.ts`)
- [x] Step 4 — runtime cursor (`runtime.ts`; 15 tests passing in
      `runtime.test.ts`)
- [x] Step 5 — composition + public API (`computeClusterTable.ts`; 16 tests
      passing in `computeClusterTable.test.ts`)
- [ ] Step 6 — overlay wiring: `collectClusterLeaves` filter DONE
      (`src/canvas/cluster-input.ts`; 12 tests passing in
      `cluster-input.test.ts`); REMAINING: the rebuild reaction, runtime
      hookup, badge component, and `comments-overlay.tsx` rendering
      integration (contract points 2–5 of the step 6 brief)

---

## Step 2 — capped replay

Context: `CLUSTERING.md` §7.3, appendix A.1/A.2. This stage consumes the MST and
produces the raw merge events — one per MST edge — each with its effective
threshold `zEff = min(gap, fit)`, in firing order. It is the stage where the
screen-space diameter cap lives, and it requires a max-heap with lazy keys
because cap deferrals reorder events.

### Files

- Extend `packages/commenting/src/clustering/types.ts` with the two types below.
- Create `packages/commenting/src/clustering/replay.ts`.

### Types to add to types.ts (verbatim)

```ts
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
```

Note the merged-node id scheme `cluster:${count}:${minMemberId}` is unique:
clusters containing a given leaf form a nested chain with strictly increasing
counts. Assumption (document, don't validate): leaf ids never start with
`cluster:`.

### replay.ts

```ts
export const D_FLOOR = 1e-9

export function cappedReplay(
	leaves: readonly LeafInput[],
	edges: readonly MstEdge[],
	opts: { Tc: number; Dmax: number }
): RawMergeEvent[]
```

`edges` is the output of `mstEdges(leaves)` (indices reference `leaves`).

### Behavioral contract

1. Throws if `Tc <= 0`, `Dmax <= 0`, or `Dmax < Tc`, with a message naming the
   offending option. (Callers validate leaf/edge integrity upstream; you may
   assume `edges` is a spanning tree of `leaves`.)
2. Returns exactly `edges.length` events (n − 1 for n leaves; `[]` for < 2).
3. Each event's threshold:
   - if `e.d < D_FLOOR`: `z = Infinity`, full stop — coincident anchors are
     permanently merged and the fit term is NOT consulted. (A literal
     `min(Infinity, Dmax/diag)` would yield a huge-but-finite z for
     `0 < d < D_FLOOR`; the design intent, CLUSTERING.md §8.3, is exactly
     `Infinity`.)
   - otherwise `z = min(Tc / e.d, Dmax / diag)` where `e.d` is the ORIGINAL
     MST edge length (never recomputed, never measured from centroids) and
     `diag` = the diagonal of the union of the two current clusters' bounding
     boxes at the moment the merge fires, computed as exactly
     `Math.hypot(width, height)` — pinned so tests can assert exact float
     equality. Note `diag >= e.d >= D_FLOOR` here (the union bbox contains
     both edge endpoints), so the fit term is always finite on this branch.
4. Replay semantics (the reference definition tests will simulate): repeat
   n − 1 times — among all MST edges whose endpoints resolve (via union-find)
   to two distinct current clusters, compute each edge's current `z`; fire the
   edge with the **highest** `z`; ties broken by the edge's normalized id pair,
   ascending `idLo` then `idHi`. Firing an edge unions the clusters,
   accumulates bbox / count / count-weighted centroid / merged member list, and
   emits the event. Implementation should be the lazy-key max-heap of
   CLUSTERING.md §7.3 (valid because keys only decrease), but any
   implementation reproducing the reference sequence exactly is acceptable.
5. Output order = firing order. The emitted `z` sequence must be
   non-increasing (equal values allowed).
6. Node bookkeeping, all deterministic:
   - Leaf nodes: `id` = thread id, `centroid` = the anchor point, `count` = 1,
     `members` = `[id]`.
   - Result nodes: id per the scheme above; `members` = sorted union of the
     children's members; `count` = sum; `centroid` = count-weighted mean,
     computed incrementally at each merge as exactly
     `(countA·centroidA + countB·centroidB) / (countA + countB)` per
     component — pinned so tests can assert exact float equality.
   - `children` tuple ordered by ascending min-member id.
7. Pure; `leaves` and `edges` unmodified; repeated calls byte-identical.

### What the tests will check

Hand-computed fixtures: a gap-limited pair (`z = Tc/d`); a coincident pair
(`z = Infinity`); the ABCDE path of appendix A.1 with a huge `Dmax` (events =
edges ascending by d, `z = Tc/d` each); the 8-pin chain of appendix A.2 with
`Tc = 40, Dmax = 120` (exact firing sequence including the deferred bridge at
`z = 120/70`, and the resulting three zoom bands). Properties on random inputs
vs. an independently written O(n³) reference simulator (clause 4): identical
event sequences; non-increasing `z`; dendrogram integrity (every node consumed
at most once, members/counts/centroids consistent); the locality invariant
`z × bboxDiag(result.members) ≤ Dmax` (+ float epsilon) for every finite-z
event; shuffle invariance; option validation.

---

## Step 3 — contraction + finalize

Context: `CLUSTERING.md` §7.4, §7.5. Two pure passes over the event list:
`contract` fuses near-equal-threshold merges within connectivity chains
(deleting sliver states), then `finalize` attaches hysteresis split thresholds
and applies the zoom clamps.

### Files

- Extend `types.ts` with the two types below.
- Create `packages/commenting/src/clustering/schedule.ts` exporting both
  functions.

### Types to add to types.ts (verbatim)

```ts
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
```

### schedule.ts

```ts
export function contract(raw: readonly RawMergeEvent[], eps: number): ContractedEvent[]

export function finalize(
	events: readonly ContractedEvent[],
	opts: { Tc: number; Tu: number; minZoom: number; maxZoom: number }
): MergeEvent[]
```

### Behavioral contract — contract()

1. Throws if `eps < 0` or not finite. `raw` is assumed sorted non-increasing
   by `z` (the step 2 output).
2. Window pass: walk `raw` left to right. A window starts at the first
   unconsumed event (the **anchor**) and extends while
   `raw[j+1].z >= raw[i].z / (1 + eps)` — compared against the ANCHOR, never
   the previous event (bounds every window's span to one `(1+eps)` factor; a
   gradient must break into multiple windows). An `Infinity` anchor admits only
   other `Infinity` events. `eps = 0` still groups exact ties.
3. Within a window, partition events into **chains**: connected components
   under the relation "event A's `result.id` appears among event B's children
   ids". Events in the same window but different chains are unrelated merges
   that merely share a threshold — they must NOT fuse.
4. Each chain emits exactly one `ContractedEvent`:
   - `zMerge` = the window anchor's `z` (for every chain in the window, even a
     chain whose own events all have lower z — synchronized firing is intended),
   - `children` = all clusters consumed by the chain's events minus those
     produced within the chain, ordered by ascending min-member id,
   - `result` = the chain's final cluster (the one result no chain event
     consumes).
     Intermediate nodes must appear nowhere in the output — in no event's
     children and no event's result.
5. Output ordered non-increasing by `zMerge` (window anchors are already
   descending; within a window, order chains by ascending min-member id of the
   result). A single-event window passes through unchanged apart from the type.
6. Pure and deterministic.

### Behavioral contract — finalize()

7. Throws unless `0 < Tc < Tu`, `0 < minZoom < maxZoom`, all finite.
8. `r = Tu / Tc`. For each event, `zSplit = zMerge * r` (`Infinity` stays
   `Infinity`), then the band-straddle clamp: if `zMerge < maxZoom`, set
   `zSplit = min(zSplit, maxZoom)`. (Since `r > 1` and `zMerge < maxZoom`, the
   result is always strictly greater than `zMerge` — do not "fix up" anything.)
9. Prune: drop the trailing suffix of events with `zMerge < minZoom` (they can
   never fire; they are a suffix because the list is sorted descending).
10. Output preserves the remaining events' order and everything but `zSplit`.
    Resulting invariants (tests assert all of `CLUSTERING.md` §7.6): `zMerge`
    non-increasing, `zSplit` non-increasing, `zSplit > zMerge` for every
    finite-`zMerge` event (the one exception: coincident clusters have
    `zMerge = zSplit = Infinity` and never split), dendrogram integrity,
    determinism.

### What the tests will check

`contract` gets synthetic hand-built `RawMergeEvent[]` inputs (this is why it
must not require running the replay): a two-event chain within eps fusing to a
3-way event at the anchor z with the intermediate erased; the same two events
just outside eps staying separate; two spatially unrelated pairs with
near-equal z in one window emitting two events with the same `zMerge` and
disjoint members; a geometric gradient (each step within eps of its neighbor,
total span far beyond eps) breaking into multiple anchored windows; a chain
crossing a window boundary (later event references the fused result, intact);
`eps = 0` tie fusion; `Infinity` windows. `finalize` fixtures: plain ratio
(`zSplit = 1.5 × zMerge`); the band-straddle numbers from CLUSTERING.md
(`zMerge 6, r 1.5, maxZoom 8` → `zSplit 8`, not 9); `Infinity` passthrough
(no clamp — permanently merged); min-zoom prune; validation errors. Plus
composed properties: `finalize(contract(cappedReplay(...)))` on random points
satisfies every §7.6 invariant, and with `eps = 0` on tie-free input,
contraction is the identity (event count n − 1).

---

## Step 4 — runtime cursor

Context: `CLUSTERING.md` §8. The per-frame side: one integer cursor over the
event table plus an incrementally maintained visible set. Framework-free — the
overlay wraps it in reactive state in step 6.

### Files

- Extend `types.ts` with `ClusterTable`.
- Create `packages/commenting/src/clustering/runtime.ts`.

### Types to add to types.ts (verbatim)

```ts
/** The precomputed clustering schedule for one page's comments. */
export interface ClusterTable {
	/** Sorted non-increasing by zMerge; satisfies the invariants of CLUSTERING.md §7.6. */
	events: readonly MergeEvent[]
	/** One node per input leaf, in input order. */
	leaves: readonly ClusterNode[]
}
```

### runtime.ts

```ts
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

export function createClusterRuntime(table: ClusterTable): ClusterRuntime
```

### Behavioral contract

1. `seed(zoom)`: `k` = the number of events with
   `zoom <= sqrt(event.zMerge * event.zSplit)` (geometric band midpoint;
   `Infinity` thresholds ⇒ always counted). This predicate selects a prefix
   (the products are non-increasing) — implement as a binary search, then
   derive `visible` by starting from all leaves and applying events `0..k` in
   order. Throws on `zoom <= 0` or non-finite.
2. `onCamera(zoom)` (after at least one `seed`; throw if never seeded):
   ```
   while k < events.length and zoom <= events[k].zMerge: apply(events[k]); k++
   while k > 0 and zoom >= events[k-1].zSplit: k--; unapply(events[k])
   ```
   `apply(e)`: delete each child id from `visible`, set `result`. `unapply(e)`:
   delete `result`, restore each child. Equal-`zMerge` runs fire in the same
   call. Large jumps cross many events in one call. At most one of the two
   loops does work per call (a consequence of `zSplit > zMerge`; do not guard
   for it, it falls out).
3. Postconditions after any `seed`/`onCamera` (tests assert them relentlessly):
   `visible` deep-equals a from-scratch replay of events `0..k` over the
   leaves; if `k < events.length` then `zoom > events[k].zMerge`; if `k > 0`
   then `zoom < events[k-1].zSplit`.
4. Hysteresis: a zoom inside all active/inactive bands changes nothing —
   `onCamera` with such a zoom leaves `k` and `visible` untouched (same object
   contents; no spurious rebuild of the map).
5. Empty table (`events = []`, any leaves): `visible` = all leaves at any zoom.
6. No table mutation; nodes in `visible` are the table's node objects by
   reference (no cloning).

### What the tests will check

The exact micro-trace of `CLUSTERING.md` §8.5 (seed at 5.0, out to 3.5, back
to 5.0 with no flicker, split at 6.2, zoom-to-fit to 0.8 firing two events,
pan = no-op). Seeding on each side of a band and exactly at the geometric
midpoint. Coincident (`Infinity`) events active at every zoom and never split.
Property tests driving random zoom walks against the table from steps 2–3 on
random points: postconditions of clause 3 after every step; active set always
a prefix; a monotone zoom-out sweep never decreases `k` and never decreases
any visible cluster's count-sum consistency (`Σ counts = n` at all times);
scrubbing inside a band produces zero transitions; `seed` at zoom z followed by
`onCamera(z)` is a no-op. Cross-check against an independent per-event
two-threshold hysteresis simulator (each event holds its own bit; assert the
bit-vector is always exactly the prefix mask `[0..k)`).

---

## Step 5 — composition + public API

Context: `CLUSTERING.md` §5, §7 pipeline diagram, §11. One function tying the
stages together, owning defaults and validation. This is the only clustering
symbol the overlay will import for the build side.

### Files

- Create `packages/commenting/src/clustering/computeClusterTable.ts`.
- Extend `types.ts` with `ClusterOptions`.

### Types to add to types.ts (verbatim)

```ts
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
}
```

### computeClusterTable.ts

```ts
export function computeClusterTable(
	leaves: readonly LeafInput[],
	options: ClusterOptions
): ClusterTable
```

### Behavioral contract

1. Resolves defaults (`Tc 40`, `Tu = 1.5 · Tc`, `eps 0.12`, `Dmax = 3 · Tc` —
   note defaults derive from a caller-supplied `Tc` when only `Tc` is given),
   validates the full set (`0 < Tc < Tu`, `eps >= 0`, `Dmax >= Tc`,
   `0 < minZoom < maxZoom`, all finite), then runs
   `finalize(contract(cappedReplay(leaves, mstEdges(leaves), ...), eps), ...)`
   and returns `{ events, leaves: leafNodes }` with `leaves` in input order.
2. `leaves.length < 2` → `{ events: [], leaves }` (still validated, still
   producing leaf nodes).
3. Deterministic end to end; input permutation changes only the `leaves` array
   order and nothing about the events (as id-keyed structures).
4. No re-validation gaps: every error thrown by inner stages should be
   unreachable through this function (composition passes already-validated
   options); if an inner stage throws anyway, let it propagate.

### What the tests will check

End-to-end scenarios from `CLUSTERING.md` §12 not already covered per-stage:
the full 8-pin chain producing exactly the appendix A.2 bands through
`createClusterRuntime`; two far-apart groups clustering independently
(disjoint-subtree isolation — the pure-function analogue of per-page
isolation); default resolution (`Tc: 50` ⇒ `Tu 75`, `Dmax 150`); option
validation matrix; whole-pipeline determinism and shuffle invariance;
`n = 0/1/2`; a randomized "no crash, all invariants" sweep at n up to ~300
combining every stage's invariant assertions; and the performance smoke
(n = 2,000 full build well under a frame budget multiple).

---

## Step 6 — overlay wiring

Context: `CLUSTERING.md` §6, §9, §10. The only impure step: connect the pure
pipeline to `CanvasComments` in `src/canvas/comments-overlay.tsx`. Interface is
sketched rather than frozen — propose specifics in the PR, but the following
are contractual.

1. **Build input filter** — a pure, exported function (this WILL be unit
   tested, so keep it pure and in its own module
   `src/canvas/cluster-input.ts`):
   ```ts
   export function collectClusterLeaves(
   	editor: Editor,
   	threads: readonly TLCommentThread[],
   	openThreadId: string | null
   ): LeafInput[]
   ```
   Current page only; anchors resolved through `anchorPagePoint` (skip nulls);
   skip the open thread; resolved threads included (v1 decision, CLUSTERING.md
   §6). Pending/dragged comments are naturally absent from `threads`.
2. **Rebuild reaction**: recompute the table (and re-seed the runtime) in a
   reaction over the filter's inputs — store changes, page switch, open/close,
   anchor resolution changes — never on camera changes. Camera changes drive
   only `onCamera` via a `useValue` on the editor's zoom. Read
   `minZoom`/`maxZoom` from the editor's camera options.
3. **Rendering**: `CanvasComments` maps the runtime's visible set instead of
   raw threads — `count === 1` → the existing `ThreadPin` for that thread;
   `count > 1` → a new presentational badge in `src/ui/` (fixed-size,
   screen-space, shows the count; no interactivity in v1) positioned via
   `pageToViewport(centroid)` with `Dmax`-inflated viewport culling.
4. The open thread renders exactly as today (it is exempt from the input).
   Deep-link behavior per `CLUSTERING.md` §10.
5. No store writes anywhere in the feature.

Tests here: unit tests for `collectClusterLeaves` (page filtering, null
anchors, open-thread exemption) with a stub editor; behavioral checks of the
reaction wiring at the level the package's jsdom setup allows; visual/e2e
verification is a follow-up outside this step.
