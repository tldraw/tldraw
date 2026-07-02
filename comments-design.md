# Comments for the tldraw SDK — design proposal

## Context

We're adding commenting to the tldraw SDK, with tldraw.com (dotcom) as the first consumer. Because tldraw is an SDK other teams build on, the data model has to work across very different setups: teams on tldraw sync, teams on their own sync engine, teams with an existing external comments system, and single-user/offline. This doc is the reaction-ready proposal: it leads with the two usage shapes (their pros/cons and how you wire each), then folds in every design decision we've settled.

---

## Key terms

If you don't live in the tldraw/dotcom internals, here's the vocabulary this doc leans on.

- **Store** — tldraw's in-memory reactive database on the client. Holds all of a document's data and notifies subscribers whenever anything changes.
- **Record** — one row in the store (a shape, a page, and — new here — a comment or a thread). Has an `id` and a `typeName`.
- **Diff** — a bundle of record changes: what was added, updated (with before/after), or removed. Diffs are the unit that syncs between users.
- **CUD** — Create / Update / Delete: the three ways a record can change in a diff. (It's CRUD minus the "R" — reading a record isn't a change event.)
- **Scope** (`document` / `session` / `presence`) — a record type's sync/persist behavior. `document` = synced to every collaborator _and_ saved to disk; comments are `document`. (`session` = local only; `presence` = live-but-not-saved, like cursors.)
- **Side effects** (`editor.sideEffects`) — hooks that run automatically before/after any record is created, changed, or deleted. Used to keep related data consistent (e.g. delete a shape → delete its comments).
- **Sync room** (`TLSyncRoom` / `TLSocketRoom`) — the server-side object that receives each client's diff, applies it, and broadcasts it to the others. tldraw's multiplayer server core.
- **`store.listen` / `store.mergeRemoteChanges`** — client APIs to (a) observe store changes and (b) apply changes that came from _outside_ into the store. This is how data flows in and out.
- **Durable Object (DO)** — Cloudflare's per-object server instance. dotcom runs one per file (`TLFileDurableObject`) that hosts that file's sync room.
- **Zero** — the sync engine dotcom uses for _per-user_ app data (your file list, and — new — your notifications), separate from the per-file canvas sync. A Zero "synced query" doubles as a per-user access rule: you only receive rows the query matches.
- **Kysely / Postgres / R2** — Kysely is a TypeScript SQL builder (how the DO writes rows); Postgres is dotcom's database; R2 is Cloudflare object storage, where each document's saved blob lives.
- **TipTap / Radix / StateNode** — the rich-text editor library tldraw already uses (mentions are a TipTap extension); the headless UI-primitive library (popovers); and tldraw's tool state-machine base class (how a "place a pin" tool is built).
- **`TLUserStore`** — tldraw's pluggable "resolve this user id to a name/avatar/color" system, already used for authorship attribution.
- **Source of truth** — the authoritative copy of some data. If copies disagree, this one wins; everything else is derived from it.
- **Projection** — a derived, read-only, _one-way_ copy of data shaped for a specific job (a search index, a cache, our `comment_notification` table). Computed _from_ the source of truth, never feeds back, and is disposable/rebuildable. If a projection breaks, the source is unaffected.
- **Materialized view / cache** — a stored, physically-present copy of data whose real source lives elsewhere, kept in sync so reads are local and fast (at the cost of possible slight staleness). In shape 2 the store is a materialized view of the external comment service.

---

## The one-paragraph version

Comments are **tldraw store records** (`comment_thread` + `comment`, `document`-scoped), so they get sync, persistence, offline, and referential integrity for free — the same machinery that already moves shapes. The pluggability that SDK consumers need is **not** a swappable storage backend; it's an **abstraction over the sync diff**: a reusable post-commit hook + a client-side event emitter that any backend (notifications, external mirror, moderation) subscribes to. On top of that single substrate, two usage shapes fall out (described below): one where the store is the source of truth and external systems are one-way projections (this is dotcom), and one where the store is a reactive cache of an external system-of-record. Both use the _same_ records, UI, and manager. There is no separate storage adapter, and no headless/bring-your-own-UI data path.

---

## Data model

Two `document`-scoped records, not one nested blob.

```ts
type TLCommentAnchor =
	| { type: 'shape'; shapeId: TLShapeId; offset: VecModel } // normalized 0..1 of bounds → follows move/resize/rotate
	| { type: 'page'; pageId: TLPageId; point: VecModel }
	| { type: 'point'; pageId: TLPageId; point: VecModel } // arbitrary canvas coordinate
	| { type: 'document' } // sidebar-only, no pin
// | { type: 'text-range'; shapeId; from; to }                 // v2

interface TLCommentThread {
	// scope: 'document'
	anchor: TLCommentAnchor
	resolved: boolean
	resolvedBy: string | null
	resolvedAt: number | null
	createdAt: number
	authorId: string
	meta: JsonObject
}
interface TLComment {
	// scope: 'document'
	threadId: TLCommentThreadId
	body: TLRichText // same rich-text type as shapes
	authorId: string
	createdAt: number
	editedAt: number | null
	mentions: string[] // denormalized userIds
	meta: JsonObject
}
```

**Why two records, not a `replies[]` array:** replies sync/merge independently (a nested array is last-write-wins → lost offline replies), per-reply integrity, indexable queries (`store.query.index('comment', 'threadId')`), and reply order via `createdAt` + id tiebreak. Anchor validated with a discriminated-union validator; `body` as `T.jsonValue`. Registered via `createTLSchema({ records })` with custom migration sequences (`com.tldraw.comment` / `com.tldraw.comment_thread`). No tombstone/`deleted` field is needed given the delete semantics below.

---

## The architecture spine: store records + an abstraction over the diff

Everything hangs off one idea: **a comment write is just a store diff, and consumers subscribe to that diff** — on the client via an event emitter, on the server via commit hooks.

### Client — a dedicated `CommentManager` emitter

`commentManager.on('comment.created' | 'updated' | 'deleted' | 'thread.resolved' | 'mention', cb)`. This is a thin convenience layer over `store.listen(...)` — tldraw's built-in "tell me when records change" subscription, which already fires for both local edits **and** changes synced in from other users — filtered to comment records and translated from raw record changes (create/update/delete, i.e. **CUD**) into meaningful events like `thread.resolved`.

This follows an **established in-repo pattern**, not a new invention: `PerformanceManager` (`editor.performance.on(...)`) is a manager with its own typed event map kept off the core `TLEventMap`, events derived from editor hooks, lazy subscription. `TLSyncRoom.events` (nanoevents) is a second precedent. The only difference: `editor.performance` can be a built-in property because it lives in the editor package; `CommentManager` lives in the separate comments package, so it's reached via the comments context (`useComments().manager.on(...)`) rather than `editor.comments`. Comment events deliberately do **not** go on core `emit-types.ts` — core must not reference a feature that ships above it.

### Server — a write-authorization gate (before) + a post-commit tap (after)

There's no clean "here's the committed diff" hook on `TLSocketRoom`/`TLSyncRoom` today (`storage.onChange` lacks the diff; `onAfterReceiveMessage` is pre-commit/per-message; `onBeforeSendMessage` is per-recipient). We add two:

1. **`authorizeChange` (before commit, can veto/rewrite) — the write-gate.** Required in v1 because:
   - **forgery is trivial:** dotcom sometimes exposes `editor` on `window`, so creating a comment/mention is one console line, not a hacked client. And unlike a shape edit, a mention _reaches out and pings a human_.
   - **comment-only permission IS this hook:** for a `comment`-capability session you must inspect the incoming diff and reject shape edits while letting comment writes through — the same machinery.

   The gate: reject writes whose `authorId` ≠ the session's authenticated id (or ≠ the server-stamped guest id); drop/ignore mentions of users without file access; filter the diff to comment records only for comment-only sessions.

2. **`onAfterApplyChanges(diff)` (post-commit tap).** Fires once after a push commits. Consumers derive notifications, mirror to an external store, etc. The notification step **still re-derives mentions from the authoritative body** (defense in depth — never trust a client-asserted mention list even on an authorized write).

**Auto-wire vs ship-and-guide:** for tldraw sync (and dotcom) we register both hooks. For **custom-sync** consumers we can't run code on their server, so we ship a pure `createCommentDiffHandler(diff) → { created, updated, deleted }` interpreter + the gate validators, and they call them wherever their commits land. Same functions, two wiring guides.

---

## The two usage shapes

Both use the same records, UI, and `CommentManager`. They differ only in **who owns the truth and which way data flows.** Shape 2 is literally shape 1 + two consumer-supplied wires.

### Shape 1 — store is the source of truth (default; dotcom)

Comments live in the canvas doc and sync via whatever moves the doc. External systems subscribe to the post-commit tap **one-way out** as projections (notifications, search, audit, moderation queue). Because those projections are downstream and one-directional, if one breaks (Postgres down, derivation errors) the comments themselves keep working — people can still write/read/resolve, they just won't be notified until it recovers. Notifications are a best-effort side channel, not load-bearing.

**How you wire it (dotcom):** the file's Durable Object registers `onAfterApplyChanges`. Because the diff already carries the new comment's body, the DO can re-derive mentions and write **derived** rows into Postgres (`comment_notification`, `file_thread_state`) _without ever loading the saved document blob_. Zero replicates those rows to the right recipients (the synced query `where recipientUserId = ctx.userId` is the access rule — you only ever receive your own).

The notification row also carries a **frozen plaintext preview** of the comment (rendered from the body in the diff) so the inbox list and email have something to show without loading the doc. This is a _derived snapshot for display_, not a second source of truth — the canvas store stays authoritative for the live comment. Freezing is deliberate, not a compromise: an email should show what the comment said _when it fired_, even if the comment is later edited or its whole thread deleted (you can't unsend the email). For compliance-sensitive consumers, the preview can be turned off — metadata-only notifications ("Daisy commented on X", no body).

| Pros                                                | Cons                                                                                                             |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Simplest, best DX, zero reconciliation.             | Comments coupled to doc lifecycle (delete the doc → comments go, unless you also project content out as backup). |
| Offline + sync + integrity free from the store.     | Content rides the canvas blob; large/hot docs carry comment history in R2.                                       |
| External systems optional + decoupled, fail safely. | External systems can only _react_, never _own_.                                                                  |
| It's dotcom's own path → first thing we build.      | Comment access ≈ doc access (comment-only is a special-cased capability).                                        |

### Shape 2 — store is a reactive cache; external service owns truth

Comments are still store records, but the store is a materialized view. The consumer's comment service sits where the tldraw-sync server sits (fills the store, receives writes). Our default UI works unchanged because it just reads store records.

**When you need it:** an existing comments system-of-record (compliance/retention/legal-hold), comments that must be queryable/outlive the doc, or threads shared across tldraw _and_ non-tldraw surfaces (so tldraw can't be sole truth).

**How you wire it (two wires on top of shape 1):**

- **write-through:** subscribe to the CUD events / write-through hook → `POST` to their API.
- **read-back:** their change stream → `store.mergeRemoteChanges(() => store.put(records))` → our UI reacts automatically.

**Sub-fork (consumer's call):** _optimistic_ (write store first, project out, reconcile on ack — snappy, offline-friendly, you own rollback-on-failure) vs _authoritative_ (call their service first, materialize on read-back — consistent, slower, no offline). To make optimistic ergonomic we'll design the write-through hook so a rejected `POST` can auto-rollback the local write (client-side analog of the server gate); ship fire-and-forget events first, add the async-commit variant when a shape-2 consumer needs it.

| Pros                                                                                                                                | Cons                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| External system authoritative → comments outlive the doc, queryable independently, retention/compliance, shareable across surfaces. | Consumer inherits a real two-way-sync problem (reconciliation, conflicts, rollback).           |
| Keeps our default UI (unlike headless).                                                                                             | Worse offline story.                                                                           |
| Reuses public sync API — no new adapter to design.                                                                                  | Referential integrity to shapes is on the consumer (their service doesn't know tldraw shapes). |
| Existing comments product can adopt our UI without re-platforming data.                                                             | Latency (authoritative) or rollback burden (optimistic); more failure modes.                   |

---

## Use-case matrix

Now that the substrate and the two shapes are on the table, here's what's supported and its status.

Legend: ✅ v1 · 🕒 later · ⚠️ deferred/partial

| Use case                                             | Status      | Notes                                                                                                                             |
| ---------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------- |
| tldraw sync (our sync)                               | ✅          | We auto-wire the server hooks; comments ride canvas sync. dotcom is here.                                                         |
| Own sync engine                                      | ✅          | Comments are store records → sync with whatever moves the doc. We ship the diff-interpreter; consumer wires it into their server. |
| tldraw-sync doc + external system (projection)       | ✅          | Shape 1: diff hook mirrors comment activity into their system (notifications/search/audit).                                       |
| External comment system-of-record                    | ✅          | Shape 2: store as cache, their service owns truth. Same records/UI/manager + two wires.                                           |
| Local / no-sync single user                          | ✅          | Falls out free — records + UI work offline, no server.                                                                            |
| Read-only doc + can comment (logged-in)              | ✅          | Per-session capability `read \| comment \| write`, independent of login. Enforced at the server write-gate.                       |
| Anonymous / guest commenting                         | ✅ (config) | `allowAnonymous` toggle (default off). Server stamps a guest id; guests resolve to "Guest / Anonymous X".                         |
| Bot / agent authors                                  | ✅          | Author is an opaque `userId`; a bot is a user with a `meta` flag.                                                                 |
| Spam limiting / moderation                           | ⚠️          | Deferred. Add rate limits / moderation later.                                                                                     |
| Notification _delivery_ strategy (instant vs digest) | ⚠️          | **Undecided and consumer-owned.** SDK just emits events; how they're delivered is the consumer's implementation.                  |
| Anchors: shape / page / point / whole-document       | ✅          | Discriminated union so new kinds drop in.                                                                                         |
| Text-range-within-shape anchor                       | 🕒          | v2.                                                                                                                               |
| Headless (customer owns comment _data_ + own UI)     | ❌          | Out of scope → no storage adapter needed. (UI _overriding_ while keeping our data is still in — see below.)                       |

---

## Identity, permissions, and anonymous

- **Author = opaque `authorId`** resolved through the existing `TLUserStore` attribution system (`currentUser` + `resolve(userId)`), with `getMentionableUsers(query)` supplied by the consumer for @-autocomplete. Bots/agents are users with a `meta` flag.
- **Server stamps identity.** The authenticated user id (or, for guests, a server-assigned guest id) is the source of truth for authorship — the client can't forge which user (or which guest) it is. The write-gate enforces this.
- **Permission is a per-session capability `read | comment | write`, independent of login.** "Read-only doc but can still comment" applies to logged-in users too. Enforced at the server write-gate (diff filtered to comment records for `comment` sessions). SDK-side is cheap; the lift is dotcom guest-session plumbing (unauthenticated visitor → comment-allowed session), which lands when needed.
- **Per-action permissions (resolve / edit / delete) are consumer policy.** dotcom v1 is **permissive: if you can access the document, you can do anything** — resolve/edit/delete _any_ comment, not just your own. Matches its collaborative trust model and is simplest to ship. The SDK exposes a `canPerform(action, comment, user)` hook (default: allow) for consumers who want stricter rules (edit-your-own-only, etc.), enforced at the same write-gate.
- **Anonymous is a config toggle** (`allowAnonymous`, default off). Guests can't _receive_ notifications (no inbox). Moderation/spam controls deferred.

---

## Read state, notification recipients & deletion (mostly dotcom)

These are **per-user** concerns — they deliberately don't live in the shared document store, and for non-dotcom consumers they're largely "your call" (the SDK emits events; you set policy). dotcom rides the same diff hook → Postgres → Zero pipeline.

- **Read/unread is per-user, so it is _not_ a `document`-scoped record** — your "seen" state must not sync to every collaborator. It lives outside the doc (for dotcom, in Zero: `file_thread_state`). Two halves: (a) _what comments exist_ is derived from the diff hook (comment added → `onAfterApplyChanges` → Postgres → Zero → client — exactly that flow); (b) _what I've seen_ is **client-written** per-user via a Zero mutator (`markThreadSeen`). Unread = comments newer than my last-seen. The SDK stays out of read-state persistence (per-user, consumer-owned) and just surfaces the timestamps a consumer needs to compute it.
- **Notification recipients are consumer policy, not an SDK decision.** The SDK emits `mention` + comment lifecycle events; _who_ gets pinged is the consumer's. dotcom notifies **mentioned users + thread participants** (a reply pings everyone already in the thread, no @ required). Other consumers set their own rules — we can't decide that for them.
- **Deletion propagates through the same hook.** Delete a comment/thread in the canvas store → the delete is in the diff → `onAfterApplyChanges` removes the derived Postgres rows (notifications, thread-state) → Zero drops them from clients. One path, no special-casing.
- **User deletion (GDPR / admin).** Deleting a user should clear their comments. In shape 1 the comments sit scattered across many doc blobs, so this is a **server/admin batch op**: the Zero projection makes _finding_ a user's comments cheap (query by `authorId`), but _removing_ them means a server-side write into each affected doc's store, after which the hook cleans up the projection. dotcom drives this from its admin panel. Real operational work, not free.

---

## Lifecycle & referential integrity

Registered via `editor.sideEffects` (mirroring shape→binding cleanup), guarded against recursion, running inside the triggering transaction.

- **Shape delete → `onShapeDelete: 'detach' | 'delete'`, default `delete`.** Cascade-remove anchored threads + comments. `detach` (config) rewrites the anchor to `{type:'point', point:<last pin pos>}`; a v2 `detachedFrom` could offer re-linking.
- **Undo interaction (important):** _direct_ comment-UI mutations run `history: 'ignore'` (not undoable). But comment changes that are **side effects of an undoable canvas op** (this cascade) ride that op's transaction — so undoing a shape delete restores its comments too. Fat-finger safe.
- **Root-comment delete → delete the whole thread** (Figma-style). Deleting a _reply_ just removes that reply. Since this is destructive + not-undoable, the **UI must confirm** ("Delete this thread and N replies?"). (Alternatives considered: promote-next-reply, tombstone — rejected for simplicity.)
- **Page delete →** delete threads anchored to that page + their comments (nowhere to detach; matches page-delete semantics).
- **Load-time / remote-merge integrity:** run a `commentIntegrityChecker` inside `store.mergeRemoteChanges` (so cleanup isn't a user edit / undo entry): drop comments with missing `threadId`, drop empty threads, detach/delete shape-anchored threads whose shape is gone per config. A `store.listen({source:'remote'})` handler reconciles the "teammate deleted a shape while I was offline" case.

## What travels with the doc

Comments are `document`-scoped (they persist and sync), but they're **content-adjacent, not content** — so they're kept out of user-facing outputs:

- **Copy-paste:** comments aren't selectable, so copying shapes never copies their comments. Free.
- **Image / PDF / SVG export:** pins are DOM overlays (`InFrontOfTheCanvas`), not part of the shape render → naturally absent from exports. (The overlay choice pays off.)
- **`.tldr` download / `getSnapshot`:** these serialize `document`-scoped records, so comments _would_ be included by default — we **explicitly strip comment records** from user-facing snapshot exports/downloads. The distinction that matters: _internal_ persistence (sync / R2) keeps comments (they must survive reloads); only the _user-facing_ export/download filters them out.

## Undo/redo

Comment mutations are **not undoable** (`history: 'ignore'`) — avoids multiplayer resurrection/overwrite, matches Figma/FigJam, plays nice with shape 2. Keep an `undoable?: boolean` config as a likely future option; ship not-undoable.

## Anchor → pin position

`getThreadPagePoint(editor, thread)`: shape → `getShapePageBounds` + `getShapePageTransform` applied to the normalized offset (`null` when the shape is absent/off-page → pin hidden); point/page → shown only on its page; document → `null`. Screen position via `editor.pageToScreen(point)` inside a `useValue` keyed on the camera.

## Config surface

A `<TldrawComments>` options object: `undoable` (default false), `allowAnonymous` (default false), `onShapeDelete` (default `'delete'`), `getMentionableUsers(query)`, and shape-2 write-through/read-back hooks. Grows as needed.

## UI & extension points

Comment UI extends tldraw's _existing_ override surface — it doesn't invent a parallel one. The default components:

| Component                | Mounts via                                                                  |
| ------------------------ | --------------------------------------------------------------------------- |
| `CommentPins`            | `components.InFrontOfTheCanvas` (DOM pins that host the popover)            |
| `CommentThreadPopover`   | Radix popover anchored to the pin                                           |
| `CommentsSidebar`        | a panel slot                                                                |
| `CommentComposer`        | reuse `RichTextArea` + `tipTapDefaultExtensions` + a new `MentionExtension` |
| `CommentTool` (optional) | `StateNode` "place a pin" mode                                              |

**Customization is a gradient**, all on the same store-backed data + sync:

- **zero-config** — the full default pins / popover / sidebar / composer.
- **swap a piece** — override a component through the same `components` prop people already use (`TLComponents` / `TLUiComponents`), e.g. `components={{ CommentThreadPopover: MyPopover }}`. Plus CSS tokens for color/spacing.
- **slots** — render-props inside default components for partial tweaks (custom composer footer, extra thread action) without replacing the whole component.
- **fully headless UI** — ignore our components entirely; use `manager` + reactive queries + `getThreadPagePoint` to render your own pins/threads while keeping store-backed data, sync, and notifications.

Two independent axes: **who owns the data** (shape 1/2) vs **whose React renders it** (default → swapped → fully custom). This is _not_ the dropped headless-_data_ path — that was the customer owning storage; this is just owning the pixels.

**Rides existing systems (no net-new design):** presence "is typing" (cursor-presence sync), accessibility (the `A11y` component), mobile/responsive, and i18n (the translations pipeline) all reuse what tldraw already has — comments just plug in.

---

## Package boundary & integration DX

**Reopened — leaning toward in-`tldraw`.** Two viable placements; the deciding factor is integration DX, and the delta is large enough to reconsider the earlier "separate package" call.

### Option 1 — separate opt-in `packages/comments`

Precedent: `@tldraw/mermaid` (peer-dep on `tldraw`, opt-in via dynamic import). Clean, fully opt-in, zero bundle cost if unused. But **four integration touch points**, because a package layered _on top_ of `<Tldraw>` can neither inject records into the store `<Tldraw>` creates nor natively provide the React context:

1. install `@tldraw/comments`
2. thread `records: commentSchemas` into store / `useSync` creation
3. `components={commentUiComponents}`
4. `<TldrawComments>` wrapper + a `useComments()` context/registry

### Option 2 — in `packages/tldraw`, opt-in via a `comments` prop

Because `<Tldraw>` owns store creation _and_ the tldraw-level contexts, it can do the two things a layered package can't — inject the records and provide the context — collapsing integration to one prop:

```tsx
;<Tldraw comments={{ getMentionableUsers }} />
// records auto-injected into the store; UI mounted; tool added; context provided.
const { manager } = useComments() // works anywhere under <Tldraw>, no wrapper
```

Comments slot into the existing defaults machinery (`mergeArraysAndReplaceDefaults` for shapes/tools/components, `Tldraw.tsx:200-228`) and the existing override surface (`TLComponents` / `TLUiComponents`). Sync still needs one flag (`useSync({ comments: true })`) since the synced store is created outside `<Tldraw>`, and "enable comments" is an app-level choice (all clients in a room share a schema). Note: **no `editor.comments` property** either way — the manager needs tiptap/UI so it can't live in core `editor`; it's a tldraw-level context like `useToasts`.

### Comparison

|                  | separate `@tldraw/comments`                   | in `packages/tldraw` (prop)                                                                 |
| ---------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| integration      | ~4 touch points                               | 1 prop (+1 flag for sync)                                                                   |
| records friction | you thread them                               | auto-injected on enable                                                                     |
| UI customization | parallel `commentUiComponents` bag            | unified into existing `components` prop                                                     |
| bundle           | zero if unused                                | ships with tldraw (lazy-import-mitigable; tldraw's already large)                           |
| release / API    | independent cadence, no tldraw API commitment | fixes bump tldraw, share its API-surface commitment                                         |
| schema           | opt-in only for users                         | keep records opt-in-injected (not in the default schema) to avoid a permanent migration tax |
| identity fit     | "an add-on"                                   | matches tldraw = "complete SDK with default UI, shapes, tools"                              |

**Lean: Option 2**, with records injected on-enable (never baked into the default schema). The DX delta is large, comments fit tldraw's batteries-included identity, and bundle is the only real cost — marginal against tldraw's size and mitigable via internal lazy-loading. Option 1 only wins if a meaningful set of embedders want tldraw _and explicitly not_ comments, which seems thin given it's opt-in either way. **Flagged for team sign-off** — this decision fixes the mount API (`<Tldraw comments>` vs `<TldrawComments>`) that other sections reference illustratively.

---

## Build order (each shippable)

- **P0 — data model + integrity (no UI):** records, anchor union, validators, migrations, `CommentManager` CRUD + reactive queries, side effects, integrity checker, author resolution, dedicated event emitter. Vitest (schema round-trips, two-store sync, integrity, side effects, migrations).
- **P1 — server spine:** `authorizeChange` write-gate + `onAfterApplyChanges` tap on `TLSocketRoom`/`TLSyncRoom` + `createCommentDiffHandler`. Two-store test proving the gate rejects forged author / filters comment-only sessions.
- **P2 — pins + popover:** `getThreadPagePoint`, `CommentPins`, `CommentThreadPopover`, `CommentTool`, active-thread atom.
- **P3 — sidebar.**
- **P4 — rich text + @mentions:** `MentionExtension`, mention denormalization + `mention` events, `getMentionableUsers`.
- **P5 — presence "is typing".**
- **dotcom (parallel track):** notification derivation (`comment_notification`, `file_thread_state`) → Zero inbox/badges; read-state mutators; comment-only room mode; guest-session plumbing; delivery strategy (TBD).

---

## Verification & testing

Grounded in the repo's existing harnesses (Vitest + `TestEditor`, integration tests in `packages/tldraw/src/test`, e2e in `apps/examples/e2e`).

**Spike first (de-risk the #1 risk).** Before any UI: add `onAfterApplyChanges` + `createCommentDiffHandler` and a two-store `TestEditor` test proving comment create/reply/resolve flows client → server → client. Proves the spine before we build on it.

**SDK unit / integration (Vitest + `TestEditor`):**

- schema round-trips + migrations for both records
- `CommentManager` CRUD + reactive queries
- side effects: shape-delete cascade/detach, page-delete, root-delete → thread-delete, recursion guard
- integrity checker: dangling comment / empty thread / missing-shape thread, on load _and_ on remote merge
- two-store sync: create/reply/resolve in A appears in B; offline edits merge cleanly
- undo: comment ops not undoable; shape-delete cascade rides the shape's undo (undo shape → comments return)
- events: local + remote fire with correct `source`; mention denormalized, `mention` emitted only for newly-added users
- anchor → pin: move/resize/rotate updates the point; off-page → `null`

**Server spine:**

- `authorizeChange` rejects forged author; filters a comment-only session's diff (shape edits dropped, comment writes land); ignores mentions of users without access
- `onAfterApplyChanges` fires once post-commit for local _and_ remote pushes, and _not_ on snapshot load / migrate (no re-notify on reboot)
- hooks are no-ops (zero overhead) when no consumer registers them

**dotcom integration (local sync-worker + Zero):**

- mention A → `comment_notification` replicates to B's inbox + unread badge; `markThreadSeen` clears it
- comment delete → projection rows removed via the hook
- COMMENT_ONLY session: shape writes rejected, comment writes land (server-side gate test)
- frozen preview: edit a comment after notify → the notification preview is unchanged

**E2E** (`apps/examples/e2e` + an example under `apps/examples/src/examples/comments/`): pins track pan/zoom/shape-move across two tabs; popover read/write/resolve; sidebar; mention autocomplete; typing indicator across tabs.

**Static:** `yarn typecheck`, `yarn api-check` (new public API surface + committed api-report), `yarn lint`.

---

## Still open / consumer-owned

- **Sync-core hooks = the #1 technical risk.** `authorizeChange` + `onAfterApplyChanges` are new surface in the _shared, hot_ sync path — they affect all tldraw-sync users, not just comments. Contain blast radius by making them no-ops when unused, and **spike them first** (two-store test) before building on them. Runner-up risk: multiplayer merge/integrity edge cases (offline → shape deleted → comment reconciliation).
- **Opt-in schema at rest.** A doc saved _with_ comment records, later opened by an app with comments disabled or on an older schema. dotcom can **force a client update** to a matching version; the generic SDK behavior for unknown comment records at load (drop vs preserve vs error) needs verifying against tldraw's schema handling.
- **Package placement** — separate `@tldraw/comments` vs in `packages/tldraw` (leaning in-package for DX; team sign-off needed). Fixes the mount API (`<Tldraw comments>` vs `<TldrawComments>`).
- **Notification delivery strategy** (immediate vs daily digest vs …) — undecided, and an SDK-consumer implementation detail, not an SDK decision.
- **Anonymous moderation / spam limiting** — deferred.
- **Shape-2 optimistic-vs-authoritative default** — consumer's call; SDK supports both.
- **`detachedFrom` re-linking** for detached threads — v2.
