# Comment pin clustering — design

Zoom-dependent clustering for canvas comment pins: nearby pins collapse into a count badge as you zoom out and separate again as you zoom in. The full merge/split schedule is **precomputed once per comment set**; the per-frame work is a cursor moving through a static table. No spatial queries, no distance measurements, and no allocation happen per frame.

**Scope for v1:** zooming in and out is the _only_ clustering affordance. There is no "click badge to expand", no spiderfying, no hover previews. A badge is a passive marker; the user zooms to resolve it.

---

## 1. Problem and setting

Comment pins are **screen-space UI**, not canvas content. `CanvasComments` (`src/canvas/comments-overlay.tsx`) portals a layer into the editor container, above the canvas transform. Each pin projects its page-space anchor through the camera every frame:

```
screenPos = pageToViewport(anchorPagePoint(editor, thread.anchor))
```

Pins are positioned by the camera but **not scaled** by it — a pin is always ~the same pixel size. Consequence: zoom out far enough and pins crowd, overlap, and become unusable. We want:

- nearby pins to merge into a single badge showing a count,
- merged badges to split back apart on zoom-in,
- **no flicker** when the zoom hovers near a boundary,
- **no fleeting intermediate states** (a "2" badge that exists for a sliver of zoom before becoming "3"),
- **no badge that misrepresents locality** (one badge standing for pins spread across half the screen),
- near-zero per-frame cost, with all heavy work done once per comment change.

## 2. The foundational reduction

The tldraw camera has translation and uniform scale only (no skew; rotation, if ever added, is an isometry and changes nothing below). For any two pins with page-space distance `d`:

```
screenDist = zoom · d          // pan cancels — it offsets both pins equally
```

Three consequences, and everything in this document follows from them:

1. **Pan never affects clustering.** Only zoom does.
2. **Every pair of pins has a critical zoom.** For a screen-space merge distance `T` the condition `zoom · d ≤ T` flips at exactly `z* = T / d`. "Which pins are merged" is a function of a single scalar.
3. **Merging is monotone in zoom.** As zoom decreases (zooming out), the set of merged pairs only grows. Zooming out only merges; zooming in only splits. This monotonicity is what makes a precomputed schedule (a dendrogram) valid at all, and it is an invariant every later refinement must preserve.

All thresholds in this design (`Tc`, `Tu`, `Dmax`) are **screen pixels** — that is what makes them pan-invariant.

## 3. Algorithm selection

Growing a distance threshold and merging everything within it is **single-linkage agglomerative clustering**, which is exactly equivalent to the **Euclidean minimum spanning tree (EMST)**: the merges, in order, are the MST edges taken by ascending length (Kruskal + union-find). Each MST edge of page length `d` is one merge event with critical zoom `T / d`. The MST is therefore a complete, lossless precomputation of the clustering at _every_ zoom level.

Single-linkage's inter-cluster distance is _nearest member to nearest member_, which the MST edge lengths already record — merging never creates new edges or re-measures anything (see §7.3).

Rejected alternatives, and why:

| Alternative                                        | Why not                                                                                                                                                                                                                                                                       |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Centroid linkage (re-measure from merged midpoint) | Distances change after every merge → order-dependent, no static table; can be **non-monotone** in zoom (merge → split → merge while zooming one direction), which breaks the entire runtime model                                                                             |
| Complete linkage                                   | Tighter clusters but O(n² log n), no MST structure, no clean precompute; chaining is handled by the diameter cap instead (§7.3)                                                                                                                                               |
| k-means / DBSCAN                                   | Wrong shape of problem: we have a pure distance threshold, not a known k or a density criterion. (Single-linkage is DBSCAN with `minPts = 1`.)                                                                                                                                |
| Sparsest cut / spectral                            | Optimizes a normalized-balance objective we don't need; NP-hard; approximation machinery. Our objective is the bottleneck/max-spacing one, which is polynomial and exact via the MST                                                                                          |
| Supercluster (grid hierarchy)                      | Production-proven for maps, but greedy/grid artifacts, an extra dependency, and more machinery than comment-scale needs. Notably, our diameter cap reproduces its best property (cluster extent bounded per zoom, sizes ~doubling per zoom octave) inside the exact framework |

Theory pointers (searchable names for what this is): single-linkage = MST (Kleinberg–Tardos max-spacing clustering); the dendrogram is the subdominant ultrametric; MST paths are minimax paths; merge thresholds are the death times of 0-dimensional persistent homology, and the contraction pass (§7.4) is persistence simplification.

## 4. Parameters

| Param                | Meaning                                                                                                    | Default                                                                   | Constraints                 |
| -------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------- |
| `Tc`                 | cluster (merge) distance, screen px. Pins closer than this on screen merge                                 | ~40 (≈ pin diameter + breathing room; tune against the rendered pin size) | > 0                         |
| `Tu`                 | uncluster (split) distance, screen px. A cluster splits when its members would sit at least this far apart | `r · Tc`                                                                  | **strictly > `Tc`**         |
| `r`                  | hysteresis ratio `Tu / Tc` — the stickiness dial                                                           | 1.5 (1.3–1.6 reasonable)                                                  | **one global value** (§7.5) |
| `eps`                | contraction window (ratio). Merge events within `(1+eps)` of each other in threshold fuse into one         | 0.12 (0.1–0.15)                                                           | ≥ 0                         |
| `Dmax`               | max cluster screen extent at birth (the anti-chaining cap)                                                 | `3–4 · Tc` (e.g. 120)                                                     | ≥ `Tc`                      |
| `minZoom`, `maxZoom` | camera zoom bounds                                                                                         | read from the editor's camera options                                     | —                           |
| `D_FLOOR`            | page-distance floor below which two anchors count as coincident                                            | 1e-9                                                                      | guards ÷0                   |

Semantics of the two thresholds (hysteresis, a Schmitt trigger):

- **Merge** when the screen gap shrinks to `Tc`: `zoom ≤ zMerge = Tc / d`.
- **Split** when the screen gap grows to `Tu`: `zoom ≥ zSplit = Tu / d = r · zMerge`.
- **In between: hold the current state.** The band is what kills single-boundary flicker; with one threshold, scrubbing the zoom across it dithers merge/split every frame.

Why `Tu > Tc` specifically: equal → flicker returns; `Tu < Tc` → a dead zone where both "should merge" and "should split" hold, i.e. oscillation. `Tu` should clear the badge's own footprint so that a splitting badge releases pins that don't overlap it.

## 5. Data model

```ts
interface LeafInput {
	id: string // thread id
	point: VecLike // resolved page-space anchor point
}

interface ClusterNode {
	id: string
	centroid: VecLike // page space; count-weighted mean of leaf anchors
	count: number // leaves = 1
	members: string[] // thread ids (leaves list just their own)
}

interface MergeEvent {
	zMerge: number // fires (merges) when zoom <= zMerge; may be +Infinity (§8.3)
	zSplit: number // reverses when zoom >= zSplit; = r·zMerge, then clamped (§7.5)
	children: ClusterNode[] // clusters consumed — 2+, multi-way after contraction
	result: ClusterNode // cluster produced
}

interface ClusterTable {
	events: MergeEvent[] // sorted DESCENDING by zMerge = firing order while zooming out
	leaves: ClusterNode[]
}
```

The centroid exists **for rendering only** (where to draw the badge). It never feeds a clustering decision — clustering distances are always the original MST edge lengths (§7.3). Count-weighted accumulation on merge:

```
count    = nA + nB
centroid = (nA·centroidA + nB·centroidB) / (nA + nB)
```

The MST itself is consumed by the build and is **not needed at runtime**.

## 6. Build input

The table is built from a filtered set of threads:

> Threads on the **current page**, whose anchors **resolve to a page point**, excluding the **currently open** thread and any **in-flight (dragged or pending) comment**.

- **Current page only.** Threads carry a `pageId`; a thread on another page must neither render nor influence this page's MST (a phantom neighbor changes real thresholds). One table per page; practically, build for the current page and rebuild on page switch.
- **Resolvable anchors only.** `anchorPagePoint` can return null (e.g. shape-attached anchor whose shape was deleted). Unresolvable threads are excluded; a thread flipping between resolvable/unresolvable is a rebuild trigger.
- **Open thread exempted.** If the user has a thread's popover open and zooms out, its pin must not vanish into a badge. Exclude the open thread's leaf and rebuild on open/close (cheap, see §10). The open pin renders independently, as today.
- **Pending/dragged comments excluded.** A half-placed comment (`pendingComment`) isn't in the store yet; a picked-up comment is treated as deleted until dropped (§9.2). Both render as free-floating singles outside the clustering system.
- **Resolved threads included** (v1 decision). They cluster like any other pin, so toggling resolve is _not_ a rebuild trigger (position is unchanged; only pin appearance differs). Documented alternative: exclude resolved threads via this filter — then resolve/unresolve becomes a rebuild trigger and badge counts change.

`n < 2` short-circuits to an empty event list.

## 7. Build pipeline

```
leaves ──▶ candidate edges ──▶ MST ──▶ capped replay ──▶ contraction ──▶ finalize ──▶ ClusterTable
              (7.1)           (7.2)       (7.3)             (7.4)          (7.5)
```

Stage order is forced, not stylistic: the cap **decides what merges into what and when** (semantic, stateful — thresholds depend on evolving cluster extents), while contraction **decides which already-decided states are worth showing** (presentational, stateless pass over final thresholds). Running contraction first would window on wrong thresholds and then need its fusions split back apart by the cap — i.e. redoing the replay. Cap upstream, contraction downstream, always.

### 7.1 Candidate edges

Two interchangeable backends producing edges for the MST:

- **`allPairs`** (default): brute force, O(n²) distances computed on the fly inside Prim. Correct and fastest-to-write at comment scale (see benchmark, §9.4).
- **`delaunay`** (large-n path): the EMST is a subgraph of the Delaunay triangulation, so triangulate (O(n log n)) and run the MST on its O(n) edges — exact same tree. Use **Delaunator** (or d3-delaunay); do not hand-roll — correct Delaunay requires robust adaptive-precision in-circle predicates, and the library ships them.

Nothing downstream knows which backend ran. Swap at ~2–5k pins if ever needed.

### 7.2 Minimum spanning tree

O(n²) Prim with distances on the fly (no materialized edge list, O(n) memory):

```
function mstEdges(leaves):
    n = leaves.length
    inTree  = { 0 }
    bestD[i]    = dist(leaves[i], leaves[0])   for all i
    bestFrom[i] = 0                            for all i
    edges = []
    repeat n - 1 times:
        u = argmin over i ∉ inTree of bestD[i]
        edges.push({ a: bestFrom[u], b: u, d: bestD[u] })   // d = original page length
        add u to inTree
        for i ∉ inTree:
            if dist(leaves[i], leaves[u]) < bestD[i]:
                bestD[i] = dist(leaves[i], leaves[u]); bestFrom[i] = u
    return edges
```

(Implementation notes: flat typed arrays; compare squared distances and take one sqrt per accepted edge.)

Two structural facts the replay relies on:

- **One-edge lemma.** Every cluster the replay builds is a connected subtree of the MST (we only merge across tree edges, starting from single nodes). Between two disjoint connected subtrees of a tree there is **at most one** tree edge — a second would close a cycle. So "the edge between clusters A and B" is always unique, and each of the n−1 edges is consumed exactly once (no cycle checks needed).
- **Cut property.** The MST edge crossing any cut is the minimum-length crossing among _all_ original pairwise distances. So the unique edge between two clusters is automatically their single-linkage distance — the shortest connection. Discarded longer connections can never matter: for the same pair of clusters the union (and hence the fit term, below) is identical, and a longer `d` only lowers the effective threshold.

### 7.3 Capped replay (priority queue)

**Problem this stage solves — chaining.** Single-linkage's known failure: a line of pins each just under `Tc` apart (uniform spacing `s`) has an MST whose edges are all length `s`, hence all thresholds identical — the _entire_ line collapses in one frame into one badge floating in a huge emptied stretch of screen. The badge lies about locality. (Note: contraction cannot fix this — equal thresholds fuse in any window. It is not a scheduling problem; it is a cluster-shape problem.)

**Fix — a screen-space extent cap that is itself a zoom threshold.** Let `P` be the page-space extent of a would-be merged cluster (we use the **bounding-box diagonal**: O(1) to union, monotone under union, and ≥ the true diameter, so the cap errs conservative). Requiring the merged cluster to fit within `Dmax` screen pixels:

```
zoom · P ≤ Dmax    ⟺    zoom ≤ Dmax / P
```

— the same shape as the gap condition. So each merge has two conditions and fires at

```
zEff = min( Tc / d ,  Dmax / P(A ∪ B) )
        gap: pins close enough      fit: result compact enough
```

The cap **postpones, never forbids**: zooming out shrinks screen extents, so every deferred merge becomes legal at some lower zoom. All merges still happen eventually; structure stays a single dendrogram.

**Emergent behavior (why this produces "groups of 3–4 that coalesce"):** on the uniform chain, the cap breaks the collapse into groups of ~`(Dmax/Tc + 1)` pins, and groups pair up roughly every ~2× of further zoom-out — self-similar progressive doubling (the same shape Supercluster's grid hierarchy yields). Worked example in appendix A.2. Every badge is born at most `Dmax` wide on screen and only gets more compact as you continue zooming out.

**Why a priority queue, not sorted order:** `P` depends on what each cluster has already absorbed, so deferrals _reorder_ events (a deferred short edge can fire after a longer edge elsewhere). Replay must interleave: pop the currently-highest `zEff`, apply, update, repeat.

**Merging updates nothing but boxes.** When A∪B forms, its connections to the world are the original MST edges leaving the {A,B} subtree, at their original lengths (single linkage = nearest member). No midpoints, no new edges. The only recomputation is the **fit term** of those surviving incident edges, whose unions just grew. Edge endpoints are stored as original leaf indices forever and resolved through union-find `find()` at pop time.

```
function cappedReplay(leaves, edges, opts):
    uf   = unionFind(n)
    box[i]  = degenerate bbox at leaves[i].point
    cent[i] = leaves[i].point;  cnt[i] = 1
    node[i] = leaf ClusterNode for leaves[i]

    zEff(e) = min( gapTerm(e),  opts.Dmax / diag(box[find(e.a)] ∪ box[find(e.b)]) )
        where gapTerm(e) = e.d < D_FLOOR ? +Infinity : opts.Tc / e.d
        // coincident anchors (d ≈ 0): zEff = +Infinity — merged at every zoom, split never.
        // Must be handled explicitly: no NaN, sorts to the head of every ordering.

    heap = max-heap over edges keyed by zEff(e)
        // deterministic total order: (zEff desc, min(member thread id) asc)
        // — ties (e.g. uniform chains) must break identically across rebuilds
        //   or clusters visibly reshuffle. Determinism is for local stability;
        //   cross-client agreement is irrelevant (clustering is per-viewer, §10).

    raw = []
    while heap not empty:
        e = heap.popMax()                      // key may be stale
        k = zEff(e)                            // recompute against current clusters
        if heap not empty and k < heap.peekKey():
            heap.push(e, k); continue          // lazy-key pattern: valid because keys
                                               // only ever DECREASE (unions only grow),
                                               // so stale keys are upper bounds and a
                                               // pop that survives recheck is the true max
        ra = find(e.a); rb = find(e.b)         // distinct by the one-edge lemma
        r  = union(ra, rb)
        box[r]  = box[ra] ∪ box[rb]
        cnt[r]  = cnt[ra] + cnt[rb]
        cent[r] = (cnt[ra]·cent[ra] + cnt[rb]·cent[rb]) / cnt[r]
        raw.push({ z: k, children: [node[ra], node[rb]],
                   result: node[r] = makeCluster(cent[r], cnt[r], members) })
    return raw
```

**Monotonicity (invariant #2 preserved).** A popped-and-accepted key is the maximum of all current true keys; applying a merge can only _shrink_ keys (gap terms are frozen; fit terms only lose to growing unions). Hence the accepted `z` sequence is non-increasing → `raw` is a valid monotone dendrogram, already in firing order.

**Fine print.** With the cap, replaying over MST edges only is no longer _provably identical_ to "capped single-linkage over all pairs" in every pathological configuration (the cut property's exactness is a pure-single-linkage theorem). The same-pair dominance argument above covers the case that matters; constructing a visible discrepancy requires contrived geometry. Not worth designing around.

### 7.4 Contraction (coalescing near-equal thresholds)

**Problem this stage solves — sliver states.** Two merge events with nearly equal thresholds produce an intermediate cluster that exists for a hair of zoom: zooming out shows badge "2" for a frame, then "3". Hysteresis cannot fix this (it makes each boundary sticky; the sliver state still appears — it is a _two-boundaries-too-close_ problem, not a _same-boundary-twice_ problem). Contraction fixes it by **deleting the intermediate state from the table** — not skipping it quickly; making it unrepresentable.

```
function contract(raw, eps):                    // raw sorted desc by z
    out = []
    i = 0
    while i < raw.length:
        j = i                                   // raw[i] is the window's ANCHOR
        while j + 1 < raw.length and raw[j+1].z >= raw[i].z / (1 + eps):
            j++
        for chain in connectedChains(raw[i..j]):
            out.push({
                zMerge:   raw[i].z,             // fire at the anchor (window's highest z)
                children: consumedNotProducedWithin(chain),
                result:   finalResultOf(chain), // the one result not consumed in-chain
            })
        i = j + 1
    return out                                  // still sorted desc by zMerge
```

Design decisions, each deliberate:

- **Multiplicative window (`≥ anchor.z / (1+eps)`), not additive.** Zoom is a scale factor; "close" must mean close _in ratio_ (equivalently, within `log(1+eps)` in log-zoom), so the window means the same thing at every zoom. A linear epsilon over-fuses when zoomed out and under-fuses zoomed in.
- **Anchored to the window's first event, never the previous one.** A gentle gradient of thresholds, each within eps of its _neighbor_, would chain the whole list into one window (chaining again, on the zoom axis). Anchoring bounds every window's total span to `(1+eps)`.
- **Partition the window into connectivity chains before fusing.** A window groups by _threshold_; two merges can share a threshold while being unrelated (opposite sides of the canvas). Link events `e1 → e2` iff `e1.result ∈ e2.children`; fuse only within connected components. Unrelated same-window merges emit as **separate events with the same `zMerge`** — they stay separate clusters and merely fire in the same frame (which reads as pleasingly synchronized). A cluster is consumed exactly once in a dendrogram, so result→child links are the only sharing; erased intermediates are provably referenced nowhere outside their own chain, making the erasure safe. Windows never split chains illegally either: a chain's continuation in a later window simply references the fused result, which is preserved.
- **Fuse to the anchor's threshold — "sooner in, later out".** Chain `[A+B→P, P+C→Q]` becomes `{A,B,C}→Q` firing at the anchor z (the window's _highest_). Rationale: firing at the highest z means the group collapses the moment its tightest pair would collide, so there is **no zoom band where two pins overlap unmerged** (the flaw of fusing to the lowest z). The outer member gets absorbed at most `(1+eps)` early — invisible. Splitting at `anchor.z · r` (applied in §7.5) is then the _latest_ split — the badge releases pins only when even the tightest pair has `Tu` of room, so no post-split collision either.
- **A window of one passes through unchanged.**

**Known bounded side effect (cap interaction):** contraction can pull a cap-deferred event up to `(1+eps)` earlier than its fit term allows, so `Dmax` is soft by ≤ eps (~10–15% extent overshoot at birth, worst case). Accepted. If ever unwanted, the local fix is: don't admit fit-limited events into a window (fuse gap-limited ones only).

### 7.5 Finalize: hysteresis thresholds, clamps, prune

```
function finalize(events, opts):
    r = opts.Tu / opts.Tc                      // ONE global ratio — see invariant below
    for e in events:
        e.zSplit = e.zMerge * r                // Infinity stays Infinity (coincident)
        if e.zMerge < opts.maxZoom:
            e.zSplit = min(e.zSplit, opts.maxZoom)     // band-straddle clamp
    drop trailing events with zMerge < opts.minZoom    // optional prune (see below)
    return events
```

- **Single global `r` is a hard invariant.** The runtime's one-integer state (§8.1) requires the `zSplit` array to be sorted the same way as `zMerge`. A constant multiplier guarantees it; per-event ratios would need re-verification of the prefix property. The clamp preserves order too: `min(·, const)` is monotone.
- **Band-straddle clamp.** Without it, an event with `zMerge < maxZoom < zSplit` (e.g. merge at 6, split at 9, max zoom 8) merges on zoom-out and then **cannot be split for the rest of the session** — the user zooms into the 8× wall and `8 < 9` never releases. Clamping `zSplit` to `maxZoom` guarantees: anything that merged at a reachable zoom is splittable at a reachable zoom. (The band gets thinner near max zoom; correct trade.)
- **Deliberately unclamped:** events with `zMerge ≥ maxZoom` — pairs closer than `Tc/maxZoom` in page space (including coincident anchors, `zMerge = ∞`). These are **permanently merged**: no reachable zoom shows them apart. Accepted v1 limitation (no click-to-expand); they render as a badge forever.
- **Prune (optional):** events with `zMerge < minZoom` can never fire. They form a suffix of the descending-sorted list, and their results are referenced only by other events in that same suffix, so dropping the suffix is safe. Harmless to keep; nice to shed.

### 7.6 Output invariants

The table handed to the runtime satisfies:

1. `events` sorted descending by `zMerge` (ties adjacent; they fire in the same frame).
2. `zSplit` array sorted descending too (global `r` + order-preserving clamp).
3. `zSplit > zMerge` for every finite-`zMerge` event (hysteresis band exists; degenerate-width near `maxZoom` allowed). The one exception: coincident clusters carry `zMerge = zSplit = Infinity` — always merged, never split.
4. Dendrogram integrity: every `ClusterNode` except the final root(s) is consumed by exactly one later-firing... precisely: each node appears as a child of at most one event, and only in events _after_ (lower z than) the event that produced it. Leaves are produced by nothing.
5. Deterministic: identical input (leaf ids + positions + options) ⇒ identical table.

## 8. Runtime

### 8.1 State: one integer

Total runtime state beyond the table:

```
k: number                        // events[0..k) are "active" (merged)
visible: Map<id, ClusterNode>    // current partition, derived, maintained incrementally
```

**Prefix property (why one integer suffices).** Claim: under the update rule below, the active set is always a prefix of the event list. Sketch: suppose a later event `j` is active while an earlier `i < j` is not. For `j` to be active, zoom once dipped to `≤ zMerge[j] ≤ zMerge[i]`, which activated `i` too. For `i` to have deactivated since, zoom must have risen to `≥ zSplit[i] ≥ zSplit[j]` — which would have deactivated `j` as well. Contradiction. (Uses both sort invariants of §7.6.)

This is the collapsed form of "one hysteresis bit per edge": the bit-vector is always a prefix mask, so it compresses to its length. The current `k` is a **sufficient statistic for the entire zoom history** — hysteresis needs no timestamps and no replay.

### 8.2 Cold start / seeding

There is no prior state on first render (or after a rebuild). Events whose band contains the current zoom are ambiguous; resolve them at the band's **geometric midpoint**:

```
function seed(zoom):
    k = count of events where zoom <= sqrt(event.zMerge * event.zSplit)
        // sqrt(zMerge·zSplit) is descending (product of two descending arrays)
        // ⇒ the predicate selects a prefix ⇒ binary search
        // zMerge = ∞ (coincident) ⇒ threshold ∞ ⇒ always in the seed prefix ✓
    visible = new Map(all leaves by id)
    for e in events[0..k): apply(e)
```

O(log n) to find `k`, O(n) to derive `visible`. Runs on mount and after every rebuild.

### 8.3 Camera handler

Runs on every camera change (reactively — a `useValue` tracking the editor's zoom):

```
function onCamera(zoom):
    while k < events.length and zoom <= events[k].zMerge:
        apply(events[k]); k++                      // zooming out: fire next merges
    while k > 0 and zoom >= events[k-1].zSplit:
        k--; unapply(events[k])                    // zooming in: undo last merges

apply(e):   for c in e.children: visible.delete(c.id);  visible.set(e.result.id, e.result)
unapply(e): visible.delete(e.result.id);  for c in e.children: visible.set(c.id, c)
```

Properties:

- **Pan runs zero iterations** of either loop (zoom unchanged). Pure zoom scrubbing inside all bands also runs zero iterations — that _is_ the hysteresis hold.
- **At most one loop runs per call.** If the first loop fired, then `zoom ≤ zMerge[k-1] < zSplit[k-1]`, so the second loop's guard is false immediately (and symmetrically).
- **Arbitrary jumps are correct.** Zoom-to-fit crossing 12 thresholds fires 12 events in one call, in order, atomically before the next paint.
- Equal-`zMerge` events (contraction siblings, exact ties) fire in the same call — visually one simultaneous transition.
- Cost: O(events actually crossed); amortized ~O(1) per frame of continuous zooming. **No geometry is measured at runtime, ever** — all distances live frozen inside the table.

### 8.4 Rendering

```
for cluster of visible.values():
    p = editor.pageToViewport(cluster.centroid)     // leaves: the anchor point itself
    if p outside viewport inflated by Dmax: skip    // culling, margin rationale below
    if cluster.count == 1: render <CommentPin/> at p        // existing pin component
    else:                  render <CountBadge count/> at p  // new, fixed-size, screen-space
```

- Rendering stays in the existing portal layer (`cmt-canvas-layer`), screen-space, fixed-size, exactly like current pins. `visible` lives in an atom (as `openThreadId` does); position projection stays reactive per frame as today.
- **Culling margin:** strict correctness only needs the badge's own radius — the badge is the only rendered artifact. To additionally keep a badge renderable whenever any _member's_ anchor location is on screen, inflate the viewport by `(1+eps)·r·Dmax` (≈ 1.7·Dmax at defaults): a live cluster's screen extent is ≤ `(1+eps)·Dmax` at birth and ≤ `(1+eps)·r·Dmax` just before splitting, and a count-weighted centroid of a skewed cluster can sit a full extent (not half) from its farthest member.
- **Merge/split transition (polish, recommended):** at birth, member pins are up to `Dmax` apart and get replaced by one badge at the centroid — a visible teleport of up to `Dmax/2`. A ~150 ms slide of pins into the centroid (reverse on split) hides it and masks residual boundary noise. Purely cosmetic; no effect on the model.

### 8.5 Runtime micro-trace

Table: `E0 {zMerge 4.0, zSplit 6.0, A+B+C → P}`, `E1 {zMerge 1.0, zSplit 1.5, P+D → Q}`. Mount at zoom 5.0 → seed: `√(4.0·6.0) ≈ 4.9 < 5.0` → `k=0`, visible `{A,B,C,D}`.

| action       | zoom | loop work                     | k   | visible             |
| ------------ | ---- | ----------------------------- | --- | ------------------- |
| zoom out     | 3.5  | fire E0                       | 1   | {P, D}              |
| zoom in      | 5.0  | none — inside E0's band, hold | 1   | {P, D} ← no flicker |
| zoom in      | 6.2  | split E0                      | 0   | {A, B, C, D}        |
| zoom to fit  | 0.8  | fire E0, fire E1              | 2   | {Q}                 |
| pan anywhere | 0.8  | none                          | 2   | {Q}                 |

## 9. Rebuild lifecycle

### 9.1 Full rebuild, always — no incremental updates

On any change to the build input, **recompute the whole table from scratch** and re-seed. Incremental maintenance was considered and rejected on correctness grounds, not just effort:

- _Insertion_ "inside an existing cluster" is not local: single-linkage distance is nearest-member; a new point near a cluster's boundary can become the new closest approach between that cluster and a neighbor — a **stepping stone** that raises merge thresholds elsewhere and reorders the tree above. The seemingly-safe heuristic is simply wrong.
- _Deletion_ is worse: an EMST vertex has degree ≤ 6, so a removal can delete up to 6 tree edges, each needing a replacement search; a deleted stepping stone _splits_ chains and lowers thresholds above.
- Even a perfect dynamic-EMST structure wouldn't pay: the downstream passes (sort/heap, contraction, table build) are O(n log n) **anyway**, so incrementalizing the MST alone doesn't change the rebuild's asymptotics. Hardest engineering, cheapest part.

### 9.2 Move = delete + insert

Comments are not group-draggable (v1 product decision). A single comment being repositioned uses the lifecycle:

- **Pick up ⇒ delete** from the build input; rebuild. The in-flight comment renders as a free-floating ghost pin following the pointer, outside clustering (correct UX: a held pin should not merge into clusters it passes over).
- **Camera during the drag:** free. The dragged comment isn't in the table; the remaining n−1 pins keep their stable clustering; camera changes run only the §8.3 query. **No rebuild per frame, ever** — rebuilds are store-event-driven only.
- **Drop ⇒ insert**; rebuild; re-seed.

So "move" needs no code path of its own.

### 9.3 Trigger table

Hook rebuilds to **store/reactive changes, not UI gestures** — then local edits, undo/redo, and remote multiplayer edits all funnel through the same trigger. Concretely: rebuild is a reaction over (current page id, the filtered thread set, each thread's resolved anchor point).

| Event                                                 | Rebuild table?                              | Query/state                          |
| ----------------------------------------------------- | ------------------------------------------- | ------------------------------------ |
| zoom / pan                                            | no                                          | run `onCamera` (zoom only does work) |
| comment inserted / deleted (local, undo/redo, remote) | **yes**                                     | re-seed                              |
| comment pick up / drop                                | **yes** (as delete / insert)                | re-seed                              |
| shape move/resize/rotate affecting attached anchors   | **yes** (on drop; throttle ~100 ms if live) | re-seed                              |
| page switch                                           | **yes** (different leaf set)                | re-seed                              |
| thread popover opened / closed                        | **yes** (exemption filter, §6)              | re-seed                              |
| anchor becomes resolvable / unresolvable              | **yes** (filter change)                     | re-seed                              |
| resolve / unresolve a thread                          | no (v1 includes resolved; appearance only)  | —                                    |
| camera moves while a comment is being dragged         | no                                          | `onCamera` only                      |

**Re-seed policy.** Hysteresis state (`k`) does not survive a rebuild — event identities change. Re-seeding can visibly snap a nearby cluster at the moment of the edit. Accepted under the principle: **discrete visual changes are fine when they coincide with a discrete user action** (something just changed; change is expected). Flicker is only offensive during camera scrubbing — and the camera path never rebuilds.

### 9.4 Performance (measured)

Full pipeline per rebuild (Prim O(n²) + sort + union-find replay + contraction + centroids; flat typed arrays; Node on an M-series MacBook — the capped replay's heap adds a small constant, same asymptotics):

| n      | rebuild  | vs 16 ms frame |
| ------ | -------- | -------------- |
| 50     | 0.020 ms | ~800× headroom |
| 100    | 0.027 ms | ~600×          |
| 250    | 0.13 ms  | ~120×          |
| 500    | 0.43 ms  | ~37×           |
| 1,000  | 1.5 ms   | ~10×           |
| 2,000  | 5.6 ms   | ~3×            |
| 5,000  | 32 ms    | over budget    |
| 10,000 | 113 ms   | far over       |

Interpretation: at realistic comment counts (tens–hundreds per page) rebuild-on-every-change is invisible; ~1k is still fine even at silly rates; ~2k is where a drag-throttle matters; ≥5k is where the Delaunay backend (§7.1) earns its slot (pulls the n² term to n log n). Escalation path if ever needed: throttle during drags → Delaunay backend → (last resort) move the build to a worker. Do none of them preemptively.

## 10. Product integration details

- **Where it lives:** `packages/commenting/src/canvas/` — a pure `computeClusterTable(leaves, options): ClusterTable` module (no editor imports; trivially unit-testable) plus overlay wiring in `comments-overlay.tsx`. `CanvasComments` currently maps `threads → <ThreadPin>`; it changes to map `visible → pin | badge`. The `src/ui/` layer gains one presentational component (`CountBadge`, or a `CommentPin` variant taking a count), keeping the ui/canvas split (`ui/` = presentational screen-space, `canvas/` = editor glue).
- **Reactive shape:** table rebuilt in a reaction over the build input (§9.3); `k` + `visible` in an atom; `onCamera` driven by a `useValue` on the editor's zoom; per-pin projection via `pageToViewport` per frame, exactly as today.
- **Deep links (`?comment=<id>`):** the linked thread may currently be inside a badge. v1 behavior: find the leaf's direct parent event (the unique event listing it in `children`); center the camera on the anchor at `zoom = clamp(parent.zSplit · 1.05, minZoom, maxZoom)` — by the sort invariants this forces `k ≤ index(parent)` and the pin is visible; then open the thread. If the parent's `zSplit > maxZoom` (permanently merged cluster), open the popover anchored at the cluster centroid — the open-thread exemption (§6) then pulls the thread out of the cluster on the next rebuild anyway.
- **Open thread while zooming out:** exempted from the build input (§6), so its pin and popover persist at any zoom. Close → re-included.
- **Multiplayer:** clustering is **per-viewer presentational derived state** — it depends on the local camera and touches nothing in the store. Clients at different zooms see different clusters; nothing is synced. Determinism (§7.3 tie-breaks) is for _local_ stability across rebuilds, not cross-client agreement.
- **Never mutates the store.** The entire feature reads thread records and the camera; it writes only local UI state.

## 11. Correctness properties (the contract)

1. **Pan invariance:** clustering is a function of zoom (+ table), never of pan.
2. **Monotone dendrogram:** at fixed state, zooming out only merges; zooming in only splits. Preserved through the cap (non-increasing pop keys) and contraction (order-preserving fusion).
3. **Prefix property:** the active event set is always a prefix; state is one integer. Requires: descending `zMerge`, descending `zSplit` (global `r`, order-preserving clamp).
4. **No single-boundary flicker:** every event has `zSplit > zMerge`; between them, state holds.
5. **No sliver states:** no two _related_ (same-chain) events differ in threshold by less than a factor `(1+eps)` — intermediates within a window are deleted, not skipped.
6. **Locality honesty:** a badge's members span ≤ `(1+eps)·Dmax` screen px at birth, shrinking with further zoom-out; ≤ `(1+eps)·r·Dmax` at any live moment.
7. **No merge is forbidden:** the cap only postpones; the dendrogram always completes to one root (per connected page).
8. **Splittability within reachable zoom:** anything merged at `zMerge < maxZoom` splits at some `zoom ≤ maxZoom` (clamp). Exception, by design: `zMerge ≥ maxZoom` (closer than `Tc/maxZoom` in page space, incl. coincident anchors) is permanently merged.
9. **Determinism:** same leaves + options ⇒ same table; groupings never reshuffle across rebuilds without a positional cause.
10. **Post-split spacing:** at the moment a badge splits, its closest revealed pair sits ≥ `Tu` apart on screen (`Tu` per the fused anchor edge; contraction fuses to the tightest pair's thresholds).

## 12. Test plan

Pure-function tests on `computeClusterTable` + a tiny runtime harness (drive `zoom` sequences, assert `visible`):

- **Pair:** two pins, distance `d` — merges at `Tc/d`, splits at `Tu/d`, holds in between (scrub back and forth inside the band; assert zero transitions).
- **Coincident anchors:** `d = 0` → one permanent cluster; no NaN/Infinity leaks; seed at any zoom shows it merged; never splits.
- **Band straddle:** `zMerge < maxZoom < r·zMerge` → assert `zSplit` clamped to `maxZoom`; merged then split within reachable zoom.
- **Uniform chain (8 @ spacing s):** groups of `Dmax/Tc + 1` at `Tc/s`; one badge below the doubling threshold; matches appendix A.2 exactly.
- **Sliver deletion:** thresholds within `(1+eps)` on one chain → intermediate cluster id appears in no event's children/result; zoom sweep never renders it.
- **Unrelated same-window merges:** two far-apart pairs with near-equal `d` → two events, same `zMerge`, separate results.
- **Anchored window:** geometric gradient of edge lengths (each within eps of neighbor, span ≫ eps) → multiple windows, not one.
- **Prefix property (property test):** random point sets, random zoom walks → after every step, active set is `events[0..k)` and equals a brute-force two-threshold simulation with per-pair bits.
- **Monotone zoom-out sweep:** cluster count is non-increasing; zoom-in sweep non-decreasing.
- **Determinism:** shuffled input order ⇒ identical table.
- **Per-page isolation:** leaves on two pages → building for page 1 ignores page 2 entirely (thresholds identical to page-1-only input).
- **Rebuild lifecycle:** delete + insert (a "move") ⇒ table equals fresh build of final positions; re-seed matches `seed(zoom)`.
- **Culling bound:** random tables, random zoom walks → every visible cluster keeps all members within `(1+eps)·r·Dmax` screen px of its centroid, so the `(1+eps)·r·Dmax`-inflated cull never hides a badge whose members are on screen.

## 13. Out of scope (v1)

- **Badge interactions** — click-to-expand/zoom, spiderfying, hover previews. Zoom is the only affordance; permanently-merged clusters (§7.5) are the known cost, revisit with badge UX later.
- **Incremental/dynamic MST** — rejected on correctness and cost grounds (§9.1).
- **Workers / WASM / typed-array heroics beyond the basics** — unjustified below ~5k pins (§9.4).
- **Per-cluster hysteresis** (splitting a cluster as a whole on spread) — per-link hysteresis composes with the MST and needs no member re-clustering on split.
- **Cross-client cluster agreement** — meaningless; clustering is camera-dependent per viewer.

## Appendix A — worked examples

### A.1 Plain replay (no cap needed): path A–E

MST path `A —10— B —25— C —12— D —40— E`, `Tc = 300`, `Tu = 450` (`r = 1.5`):

| fires at zoom | via edge (original length) | partition after |
| ------------- | -------------------------- | --------------- |
| 30.0          | A–B (10)                   | {A,B} C D E     |
| 25.0          | C–D (12)                   | {A,B} {C,D} E   |
| 12.0          | B–C (25)                   | {A,B,C,D} E     |
| 7.5           | D–E (40)                   | {A,B,C,D,E}     |

The {A,B}+{C,D} merge is carried by the **original** B–C edge at its original length 25 — decided when the MST was built, before any merging. Merging collapses nodes in the union-find view; the edge view keeps the original tree and weights, consulted through `find()`.

### A.2 The chain, with the cap

8 pins in a line, spacing `s = 10` page units; `Tc = 40`, `Dmax = 120`, ties left-to-right. All 7 edges have `d = 10` → gap term 4.0 everywhere.

| merge                                | union page span P | fit = 120/P | zEff = min(4.0, fit) |
| ------------------------------------ | ----------------- | ----------- | -------------------- |
| P1+P2                                | 10                | 12.0        | 4.0                  |
| {P1,P2}+P3                           | 20                | 6.0         | 4.0                  |
| {P1..P3}+P4                          | 30                | 4.0         | 4.0                  |
| {P1..P4}+P5                          | 40                | 3.0         | **deferred** (3.0)   |
| P5+P6 / +P7 / +P8                    | 10/20/30          | 12/6/4      | 4.0 each             |
| {P1..P4}+{P5..P8} (edge P4–P5, d=10) | 70                | ≈1.71       | **1.71**             |

Resulting bands: `z > 4.0` → 8 pins; `1.71 < z < 4.0` → two badges of 4; `z < 1.71` → one badge of 8. Each badge is born exactly `Dmax` wide on screen (30·4.0 = 120; 70·1.71 ≈ 120) and shrinks thereafter. Contraction then fuses each group's internal `+P2, +P3, +P4` events (identical z, one chain) into one atomic multi-way birth — no 2-then-3-then-4 stutter, even in the table.

Note the deferred candidate: while deferred, its endpoints were {P1..P4} and {P5}; by the time it fires, `find()` resolves them to {P1..P4} and {P5..P8} — same edge, updated union, updated fit term. That is the priority queue earning its keep.

## Appendix B — glossary

| Term            | Meaning here                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------ |
| leaf            | one comment thread's pin (page-space anchor point)                                                                 |
| cluster         | a set of leaves currently rendered as one badge (or a single leaf as a pin)                                        |
| event           | one merge in the dendrogram: children → result, with `zMerge`/`zSplit`                                             |
| dendrogram      | the full merge tree; here multi-way after contraction                                                              |
| single linkage  | inter-cluster distance = nearest member pair; equals the MST edge between them                                     |
| chaining        | single-linkage failure mode: chains of close pins fuse into one sprawling cluster; solved by the cap               |
| hysteresis      | two thresholds (merge/split) with hold in between; kills boundary flicker                                          |
| contraction     | fusing near-equal-threshold merges in one chain into one atomic event; kills sliver states                         |
| persistence     | how long (in zoom) a cluster exists between its birth and absorption; contraction deletes low-persistence clusters |
| `zEff`          | a merge's effective threshold: `min(gap, fit)`                                                                     |
| prefix property | active events are always `events[0..k)`; the reason runtime state is one integer                                   |
