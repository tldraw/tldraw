# Comments architecture — options considered & recommendation

A consolidated comparison of every storage/sync architecture we weighed for comments. The two deep-dives stay as-is: `comments-design.md` (the store-backed proposal, option A) and `comments-app-data-layer.md` (option C). This doc is the map + the call.

The decision is only ever about **where comment _data_ lives and how it syncs.** Everything else — records, `CommentManager`, the client event emitter, the default UI, the anchor→pin math, packaging — is shared across all options.

---

## The options

### A. Store-backed (shape 1) — comments in the canvas document store

Comments are `document`-scoped records that ride the canvas sync the consumer already runs. External systems (dotcom's notifications) are one-way projections derived from the sync diff.

- **Pros:** turnkey DX (offline + undo + referential integrity free); tight _atomic_ shape-coupling (cascade in one transaction); works for **every** consumer regardless of infra; dogfoodable; simplest.
- **Cons:** coupled to doc lifecycle (blob bloat, strip-from-export); cross-doc inbox needs a **derived projection**; comment-only permission = the risky `authorizeChange` diff-gate; the two new sync-core hooks are the **#1 technical risk**.

### B. External system-of-record (shape 2) — store as a reactive cache

Comments are still store records, but the store is a cache of an external service that owns truth; consumer wires write-through + read-back.

- **Pros:** comments outlive the doc (retention/compliance/queryable); keeps our UI; reuses the public sync API (no new adapter); an existing comments product can adopt our UI.
- **Cons:** consumer owns a real two-way-sync problem (reconciliation, rollback, conflicts); worse offline; cross-store shape integrity on them; latency or rollback burden. Only viable if you already have a comments backend.

### C. App-data / query-sync layer (Zero-shaped) — comments as per-user app-data

Comments live in a per-user, query-scoped, row-level-access sync layer (Zero), tagged with `docId`. In-doc view + inbox are two queries over one layer.

- **Pros:** cross-doc inbox/notifications **native** (no projection); **deletes the #1 risk** (no diff-gate, no sync-core hooks); clean grant-level permissions; decoupled lifecycle; tolerate-dangling integrity is undo/offline-resilient.
- **Cons:** **requires a query-sync engine we won't build** (tldraw-sync can't do partial/cross-doc/row-level) → realistically **dotcom-only**; bad SDK DX if made primary (ship UI + a hole); orphan GC awkward; two presence/reconnect timelines.

### D. Parallel per-document tldraw-sync store — a second tldraw-sync room per doc

- **Pros:** decoupled lifecycle + clean permissions + kills the diff-gate, reusing tldraw-sync tech.
- **Cons:** a per-doc room is still unscannable → **still needs a projection for the inbox**, so it pays the two-rooms cost without the cross-doc payoff. **Dominated** by A (simpler) or C (actually solves the inbox). Not recommended.

### E. Headless data (dropped) — customer owns storage _and_ their own UI

tldraw contributes only pin geometry. A positioning helper, not a comments feature. Dropped.

### F. Separate persisted lane on the same wire ("Shape 1.5") — NEW

The kernel of the "sync like presence" idea, corrected. Presence's _delivery_ semantics (lossy, last-write-wins, ephemeral) are wrong for comments — a comment is a discrete append, not a current-state value; it'd drop under contention and vanish on disconnect. The salvageable part is presence's _architecture_: a distinct record category that rides the existing room but is handled separately from document persistence. Apply that with **document-grade** (reliable/persisted/merged) semantics: comments are a new record scope in the **same client store** on the **same sync connection**, but persisted server-side to a **separate lane** (not the doc blob — potentially straight to Postgres).

- **Pros:** keeps A's single-connection DX _and_ tight integrity (same client store → side effects/queries/undo work, exactly how presence records already coexist there); decouples comment storage from the doc blob (blob purity, no strip-from-export); the persistence lane can be a queryable store (Postgres) → cross-doc queries _without_ a diff-tap derivation; no second connection or engine for tldraw-sync consumers.
- **Cons:** the **biggest sync-core surgery of all** — a new persisted-but-separate scope + storage-layer partitioning + snapshot/load changes, with no precedent (presence's separate lane is the _easy_, ephemeral case) → it _increases_ the #1 risk rather than reducing it; still per-room transport, so real-time cross-doc inbox delivery still needs a per-user fan-out (Zero); doesn't fix comment-only permission (same-room → same diff-gate); the "queryable Postgres" win is something A already gets via its projection.

---

## How they support our use cases

Live contenders only (D dominated, E dropped). ✅ native · ~ works with caveat · ⚠️ needs infra/risky · ✗ unsupported.

| Use case                               | A store-backed                      | B external SoR          | C app-data/Zero                          | F separate lane (1.5)                                   |
| -------------------------------------- | ----------------------------------- | ----------------------- | ---------------------------------------- | ------------------------------------------------------- |
| tldraw sync (our sync)                 | ✅ native                           | ~ cache                 | ⚠️ needs query-sync                      | ✅ native (rides room)                                  |
| own sync engine                        | ✅ native                           | ✅ their sync = truth   | ⚠️ needs query-sync                      | ⚠️ their engine must add the lane\*                     |
| tldraw doc + external comments         | ✅ projection (one-way)             | ✅ their system = truth | ✅ if that system is query-sync          | ~ lane → their store                                    |
| local / no-sync single user            | ✅ free                             | ✗ needs a backend       | ✗ needs an engine                        | ✅ (lane persists locally)                              |
| read-only + can comment (comment-only) | ⚠️ risky diff-gate                  | ~ consumer-enforced     | ✅ clean grant                           | ⚠️ risky diff-gate (same room)                          |
| bot / agent authors                    | ✅                                  | ✅                      | ✅                                       | ✅                                                      |
| anonymous / guest                      | ✅ config                           | ~ consumer              | ✅                                       | ✅ config                                               |
| cross-doc inbox / notifications        | ⚠️ needs projection                 | ~ consumer's DB         | ✅ native                                | ~ lane=Postgres gives the data, still needs fan-out     |
| comments outlive doc / retention       | ✗ unless you project content out    | ✅                      | ✅                                       | ✅ separate lane                                        |
| **dotcom (first consumer)**            | ✅ simplest, but _eats_ the #1 risk | n/a                     | ✅ _deletes_ the #1 risk, needs the seam | ~ decouples storage, but _adds_ the most sync-core risk |

\* For a bring-your-own-sync consumer, F only delivers its separate-lane benefit if their sync server implements lane separation; otherwise it degrades to A (comments in the same persistence as the document).

**Reading the table:** **A is the only column with no ✗ and no infra dependency** — the only one that covers the full spread (including local/no-sync and any-sync consumers) out of the box. B, C, and F each improve on a specific axis (external truth / cross-doc / storage-decoupling) but every one of them either needs the consumer to bring a backend or needs invasive new sync-core surgery. So none of them can be the _base_; they're specializations on top of A's job.

---

## Recommendation

- **SDK default: A (store-backed).** The only option with turnkey DX for _all_ consumers, no sync-engine dependency, and dogfoodability. This is the product we ship.
- **B — ship as a documented _pattern_, not a built adapter.** Consumers with an existing comments backend wire write-through + read-back on the primitives A already exposes (`events` + `mergeRemoteChanges`). Near-zero extra cost.
- **C — not SDK surface** unless a second serious consumer appears. It's a **dotcom-internal decision**; its whole value is deleting the #1 risk _for dotcom_.
- **F — considered, not built.** It trades _more_ sync-core risk (a novel persisted-separate scope + storage partitioning) for modest storage-decoupling, keeps A's permission-gate risk, and its queryable-Postgres win A already achieves via its projection. On record as road-not-taken.
- **D — drop** (dominated). **E — dropped.**

**The one genuinely live question is dotcom-internal, not SDK:** shape 1 (A: eat the projection + sync-core hooks, get simplest reuse + dogfooding) vs app-data-on-Zero (C: delete the #1 risk, but pay for either the `CommentBackend` seam or a bespoke UI). Everything else is settled: **the SDK ships A.**

---

## Orthogonal decisions (independent of the above)

- **The `CommentBackend` seam** — a thin interface where A is the default impl and B/C are optional swaps. Worth shipping only if ≥2 advanced consumers want it; today a party of one (dotcom). See `comments-app-data-layer.md`.
- **Packaging** — separate `@tldraw/comments` vs in `packages/tldraw` (leaning **in-package** for DX). See `comments-design.md`.
- **Shared spine** either way — client-side `CommentManager` event emitter; for A, the server hooks + notification projection.
