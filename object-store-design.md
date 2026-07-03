# The object store as a fourth kind of record

This doc captures the design thinking behind the object store exploration (the stacked PRs #9478 → #9484 → #9486), and where it should go next. It argues that "the object store" is best understood not as a feature bolted onto sync, but as the server half of a **fourth record scope** — a peer of `document`, `session`, and `presence` — and lays out a staged path for making it one.

It's written to be read on its own, alongside `comments-design.md` (which covers the product-level options for comments; this doc covers the sync/storage architecture underneath them).

---

## The taxonomy we already have

tldraw already distinguishes kinds of state, and the distinctions run along a handful of dimensions: whether state syncs, whether it persists, who owns its lifecycle, how writes are gated, and which content surfaces (snapshots, exports, undo) include it.

Fill in the matrix for the existing scopes and for object-lane records (comments today; threads, reactions, and attachment metadata tomorrow):

|                       | `document` (shapes) | `presence`      | `session` (camera etc.) | objects (comments)               |
| --------------------- | ------------------- | --------------- | ----------------------- | -------------------------------- |
| Synced                | ✓                   | ✓               | ✗                       | ✓                                |
| Persisted server-side | ✓ (snapshot)        | ✗               | ✗                       | ✓ (own lane)                     |
| Lifecycle owner       | the document        | the session     | the client tab          | itself (attached, but separable) |
| Permission gate       | `isReadonly`        | own-record only | n/a                     | `objectAccess`                   |
| In exports / `.tldr`  | ✓                   | ✗               | ✗                       | ✗ (by requirement)               |
| Undoable              | ✓                   | ✗               | ✗                       | ✗ (by convention)                |
| Schema-migrated       | ✓                   | ✓               | ✓                       | ✓                                |

The objects column is not a combination of the existing ones. It is a genuinely new point in the space: **synced + persisted + separable lifecycle + own permission axis + excluded from content surfaces**. This is why every attempt to express comments with an existing scope fails somewhere:

- **`document` scope** (what the stack uses today) gets the transport right but the membership wrong. Object records leak into snapshots, exports, and undo unless every consumer remembers to filter. PR #9486 fixed this _server-side_ by construction (a separate storage partition), but the client half of the leak remains: `editor.getSnapshot()` still includes comments, and undo exclusion is a call-site convention (`history: 'ignore'`), not a guarantee.
- **`session` scope** gets the exclusions right but everything else wrong: session records don't sync, and — decisively — they don't persist for local-only files. `comments-design.md`'s Approach 1 promises that comments in a local file work offline with no server. No existing scope offers _persisted locally but excluded from `.tldr`_. That combination only exists as a new scope.

One clarification the taxonomy needs: **sessions are not a kind of state — they are the carrier of the permission axes.** Each synced lane pairs with one gate on the session:

- `document` ↔ `isReadonly`
- `object` ↔ `objectAccess`
- `presence` ↔ structural self-ownership (a session can only write its own presence record)

Seen this way, PR #9484 didn't add "a permission boolean"; it added the gate that the fourth lane was missing, completing the pairing.

---

## Presence is the precedent — twice over

The strongest evidence that the fourth-scope framing is correct (rather than just tidy) is that presence already demonstrates the whole pattern:

1. **Its own wire field.** `presence` sits next to `diff` on the push message — a lane multiplexed over one socket, exactly how object records travel.
2. **Its own server-side store.** `PresenceStore` is a separate in-room store with no clock and no tombstones — storage shaped to its semantics, exactly what the `objects` table is for object records.
3. **Record-level, ownership-based authorization.** A session can only write its own presence record; the server enforces this structurally by keying writes to `session.presenceId` and ignoring whatever id the client claims.

Point 3 matters most for the roadmap. The features coming after comments — threads ("only participants may resolve"), reactions ("you may only delete your own"), attachments — all need per-record ownership rules, which the binary `objectAccess` gate cannot express. That follow-up (`canWriteObject` + server-stamped `authorId`) is not a new invention: it is presence's authorization model generalized from "exactly one record per session" to "records tagged with your identity, verified by the server."

After #9486, the server has three stores matching three kinds of state:

| Store             | Clock      | Tombstones | Persisted    |
| ----------------- | ---------- | ---------- | ------------ |
| document storage  | ✓          | ✓          | ✓            |
| objects partition | ✓ (shared) | ✓ (shared) | ✓ (own lane) |
| `PresenceStore`   | ✗          | ✗          | ✗            |

We have been building the taxonomy without naming it.

---

## Where the stack is, in taxonomy terms

- **#9478** — comments exist, expressed as ordinary `document` records with server-side special-casing. Stage 0: the new column in the matrix is simulated by filters and conventions.
- **#9484** — the permission axis. `objectTypes` partitions record types at the room; object-lane writes are gated by `objectAccess` per session instead of `isReadonly`. Stage 1: the lane exists as _server configuration_.
- **#9486** — the separate store. Object records live in their own storage partition (own SQLite table / in-memory map) under the shared transaction, clock, and tombstone feed. `getSnapshot()` is pure-document by construction; `getObjectsSnapshot()` exposes the lane for separate persistence. Stage 1.5: the server half of the fourth scope is real.

Notably, all three stages required **zero wire-protocol and zero client changes**. The lane rides the existing push/patch/rebase/connect messages; the only additive field is `objectAccess` on the connect message.

---

## The staged path to a first-class scope

### Stage 2 — schema-declared lane (next, cheap)

Move the lane declaration from server config into the schema: `CustomRecordInfo` gains `lane: 'object'`, and the room and storage derive `objectTypes` from the schema instead of receiving it as options.

What this buys:

- **Single-sourcing.** Today `objectTypes` is configured in two places (room and storage) with no drift check — the one known failure mode with no compensating benefit. Schema declaration eliminates it.
- **Handshake validation nearly free.** The serialized schema already crosses the wire at connect, so client and server can detect lane disagreement instead of silently diverging.

Blast radius: tlschema and sync only. This should land as part of the stack's graduation from spike.

### Stage 3 — `RecordScope: 'object'` in `@tldraw/store` (the endgame)

Add the fourth scope for real. This is what fixes the _client_ surfaces the same way #9486 fixed the server ones — by construction instead of convention:

- `store.scopedTypes` / `filterChangesByScope` learn about objects → `editor.getSnapshot()` and `.tldr` exports exclude them automatically.
- Undo exclusion becomes structural (scope-based) instead of the `history: 'ignore'` call-site convention.
- `TLLocalSyncClient` can give objects their own IndexedDB lane → comments in local-only files persist offline and stay out of exports. This is the offline story no config-level approach can deliver.

The cost is a real audit: every scope-switch in store/editor/tldraw must be checked. Two known traps found already:

- `StoreSchema.migrateStorage`'s final cleanup pass **deletes** records whose scope isn't `'document'` — it would eat object records.
- `TLSyncClient`'s push listener filters on `{ scope: 'document' }` — object-scoped records would silently stop syncing.

Each is a one-line fix; the audit is the work. Presence also carries a warning label: scopes with bespoke semantics accrete special cases (the exactly-one-presence-type constraint, presence branches throughout sync). The fourth scope should define its semantics in the matrix above and resist growing bespoke branches beyond it.

### Forcing functions

Stage 3 gets scheduled when either of these bites:

1. The client-surface leaks matter in practice (comments appearing in `editor.getSnapshot()`, client-side exports, or the undo stack).
2. Comments in local-only files become a requirement (the offline promise of Approach 1 in `comments-design.md`).

Until then, Stages 1–2 carry the product work, including threads and reactions — whose real blocker is record-level authorization, not scope.

---

## What deliberately stays out of scope

- **Per-lane clocks and object-only subscriptions.** The shared clock is what keeps reconnect deltas, hydration, and mixed-push atomicity working unchanged. A fully independent object store (own clock, own hydration) enables partial subscriptions ("comments without the document") but costs cross-lane atomicity and protocol additions. Nothing on the current roadmap forces it.
- **Record-level authorization** (`canWriteObject`, server-stamped `authorId`, cascade hooks). Required by threads/reactions/attachments; deliberately its own follow-up so the storage and permission layers land separately. Presence's self-ownership model is the template.
- **Per-lane persistence keys.** The R2 lane keeps its `${key}/comments` name so existing rooms keep their data; a multi-tenant object store wants `${key}/objects/<lane>`.
