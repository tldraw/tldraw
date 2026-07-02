# Comments as an app-data layer — an alternative exploration

## What this is

A **thought-experiment alternative** to the store-backed design in `comments-design.md`. That doc makes comments `document`-scoped store records that ride the canvas doc (shape 1). This one explores the opposite: comments **don't live in the document at all**. They're **app-data** — synced per-user (or per-workspace) like your file list or your notifications, on a query-scoped sync engine — and the canvas doc and the comment data only meet in the UI.

This is not "shape 3 headless" (customer owns storage + their own UI, which we dropped). Here tldraw still owns the records, manager, and default UI. What changes is **where comment data lives and how it syncs**.

Read this next to `comments-design.md`, not instead of it. The conclusion is that these are two points on a ladder, and which one is right depends entirely on whether you have a query-sync engine.

---

## The core idea

A comment isn't part of any document. It's a row in a **per-user comment layer**, tagged with the `docId` (and anchor) it belongs to:

- **open a document** → the in-canvas view is a live query: `comments where docId = X`.
- **the inbox** → the same layer, a different live query: `comments where mentions contains me` (or `where I'm a participant`).
- **notifications, unread, cross-doc "all my comments"** → all local queries over the one layer.

Comments are app-data. The canvas store holds shapes; the comment layer holds comments; they're joined only at render time (by `docId` + anchor) and reconciled only loosely (tolerate-dangling, below).

---

## The one constraint that decides everything: whole-store sync vs query-sync

This is the crux, and it's why this option is **Zero-shaped, not a second tldraw-sync**.

- **tldraw-sync syncs a whole store/room.** Great per-document (you load exactly one doc's worth of data). But a per-user comment layer for a heavy user is thousands of comments across hundreds of docs. You cannot whole-store-sync that to a client. You need **subsets**: "this doc's comments," "my recent mentions." tldraw-sync has no notion of partial/query-scoped sync.
- **query-sync (Zero / Replicache-style) is exactly that.** Synced queries load subsets, enforce row-level access per client, stay reactive. Two live queries — `docId = X` and `mentions ∋ me` — into the same per-user layer.

So the moment you make comments per-user-aggregate, you have specified a **query-scoped, row-level-access, partial, reactive sync engine**. That is a different primitive from tldraw-sync, and it's the primitive dotcom already runs (Zero). Any consumer without one can't adopt this model without building or buying one.

**Key terms**

- **App-data** — per-user/per-workspace data that spans documents (file list, notifications, settings), synced independently of any one document.
- **Query-sync** — a sync engine that syncs _query results_ (subsets) with per-client row-level access and reactivity, not whole stores. Zero is the in-house example.
- **Tolerate-dangling** — an integrity model where a comment referencing a now-absent shape isn't deleted; its pin just doesn't render until (if) the shape returns.

---

## Data model

Nearly the same records as `comments-design.md`, with two differences: they carry a `documentId`, and they are **not** `document`-scoped store records — they're rows in the comment layer.

```ts
interface TLCommentThread {
  documentId: string          // NEW — which doc this belongs to
  anchor: TLCommentAnchor      // shape | page | point | document (same union)
  resolved, resolvedBy, resolvedAt, createdAt, authorId, meta
}
interface TLComment {
  documentId: string          // NEW
  threadId, body, authorId, createdAt, editedAt, mentions[], meta
}
```

Read-state and notifications are first-class rows in the same layer (not a separate derived projection — the layer _is_ the source of truth for them):

```ts
interface TLCommentSeen {
	userId
	documentId
	threadId
	lastSeenAt
}
// notifications are just a query over comments (mentions ∋ me), no separate table needed
```

Anchoring: `point` / `page` / `document` anchors are **self-contained** (no reference outside the comment layer). Only `shape` / `text-range` anchors reference the canvas across the boundary — those are the only ones that can dangle.

---

## How it behaves

- **In-doc view.** The `CommentManager` runs a live query `comments where docId = current`. Pins are positioned by reading the **canvas editor's** shape bounds (`getShapePageBounds` + the anchor offset) — the comment layer never needs canvas data; the _renderer_ joins them.
- **Real-time collaboration.** Two people viewing the same doc each hold the live `docId = X` query; one writes, the backend's reactive sync pushes it to the other's query. Latency is the backend's (Zero is fast). No canvas room involved.
- **Inbox / cross-doc.** A live `mentions ∋ me` query. Free, because the layer is already per-user aggregate. **No diff-tap, no derived projection.**
- **Notifications.** Mentions are visible in the layer server-side → notify on write. No re-derivation-from-diff.
- **Permissions.** Access is enforced by the query's row-level access rule (you only receive comments for docs you can access). **Comment-only** = you may write to the comment layer for a `docId` but only read the canvas room. Two independent grants — no diff-filtering in a shared hot path.
- **Integrity = tolerate-dangling.** The comment layer never hears about shape deletes. A shape-anchored pin renders only when its shape is present in the canvas store; otherwise it's hidden. Delete the shape → pin hides. Undo the delete → pin reappears (the comment was never touched). Offline teammate deletes your shape → your comment isn't surprise-deleted. Orphans (shape permanently gone) live on, surfaced in the sidebar as "on deleted content."

---

## The SDK abstraction this implies

To support both this and the store-backed design without forking the UI, the seam is a thin **`CommentBackend`** interface the UI/manager talk to:

```ts
interface CommentBackend {
	// reactive reads — return @tldraw/state Signals so the UI is uniform
	getDocumentThreads(documentId): Signal<TLCommentThread[]>
	getThreadComments(threadId): Signal<TLComment[]>
	getInbox(): Signal<TLCommentNotification[]>
	getUnreadCount(): Signal<number>
	// mutations — async; the backend owns optimism + access checks
	createThread(input)
	reply(input)
	edit(input)
	resolve(id)
	delete(id)
	markSeen(documentId, threadId)
}
```

- The **UI** (pins/popover/sidebar/inbox) and the **anchor→pin math** talk only to this interface + the canvas editor.
- **Reference backends:** a **Zero adapter** (dotcom), a **local/in-memory** one (single-user), and — notably — a **store-backed** one that puts comments in the canvas store. That last impl _is shape 1 from the other doc._

So the honest observation: this seam is exactly the "adapter is the center" option we considered on day one and set aside for DX. Having explored the whole space, it comes back as the clean way to make shape 1 (store-backed) and the app-data layer (query-sync) two implementations behind one UI — **if** we decide both need to be first-class. If only shape 1 is first-class, the seam is over-engineering; if dotcom goes app-data, the seam earns its keep.

---

## Pros / cons vs the store-backed design (shape 1)

|                                                                         | app-data layer (this doc)                                       | store-backed / shape 1                                  |
| ----------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------- |
| inbox / cross-doc / notifications                                       | **native** (queries over the layer); no projection              | needs a derived projection (diff-tap → Postgres → Zero) |
| the #1 risk (`authorizeChange` + `onAfterApplyChanges` on `TLSyncRoom`) | **doesn't exist** — writes/permissions are the query-sync's job | must be built (shared hot path)                         |
| comment-only permission                                                 | a grant on the comment layer                                    | diff-filtering in the shared canvas room                |
| lifecycle / retention                                                   | decoupled; comments outlive docs naturally                      | coupled to the doc blob; needs deliberate handling      |
| doc blob / export purity                                                | canvas stays pure; nothing to strip                             | comments in the blob; strip from exports                |
| integrity                                                               | tolerate-dangling (undo/offline-resilient, but orphans linger)  | tight atomic cascade in one transaction                 |
| offline (in-doc)                                                        | the backend's problem (Zero has it)                             | free from the canvas store                              |
| **infra requirement**                                                   | **needs a query-sync engine (Zero-shaped)**                     | **none beyond the sync the consumer already runs**      |
| generic SDK-consumer accessibility                                      | low (most lack a query-sync engine)                             | high (works with any canvas sync)                       |

The trade compresses to one line: **the app-data layer is cleaner on almost every axis except the one that matters most for adoption — it requires a query-sync engine.**

---

## dotcom on this

This is where it's genuinely tempting over shape 1. dotcom already runs Zero, so comments become another Zero entity beside `file_state`:

- inbox, cross-doc, unread — queries.
- notifications — a trigger on mention writes.
- permissions + comment-only — synced-query access + a grant.
- retention / user-deletion — normal Postgres, no scattered-across-doc-blobs batch op.
- **the entire `authorizeChange` / `onAfterApplyChanges` / derive-projection pipeline — the #1 risk in the other doc — never gets built.**

Cost: comments no longer share the canvas store → shape-anchor integrity is cross-store → tolerate-dangling. That is essentially the _only_ thing dotcom gives up, and it's mild.

Honest read: the store-backed case for dotcom is "simplest, one store, tight integrity." The app-data case is "delete the scariest, most bespoke machinery in the whole plan by reusing infra we already run." For dotcom specifically, that's a strong pull.

---

## Costs and open questions

- **Requires query-sync.** The defining constraint. No Zero-equivalent → this model is off the table for that consumer. We are not going to ship a mini-Zero-for-comments in the SDK.
- **Orphan GC is awkward.** The comment layer doesn't know the canvas state, so it can't cheaply tell which shape-anchored comments are orphaned. Likely answer: don't GC; surface orphans in a sidebar view. Acceptable, but a wrinkle.
- **Two reconnection timelines + two presence channels.** Canvas room and comment layer connect independently → a shapes-load-then-pins-pop-in flicker, and "Daisy is typing on this thread" comes from the comment layer, not canvas presence.
- **Two systems' offline models** to reason about instead of one.
- **The abstraction tax** if we make `CommentBackend` first-class — worth it only if both store-backed and app-data are supported.

---

## Where it lands (the ladder)

- **SDK default (everyone, zero extra infra):** store-backed / shape 1. Works with the one sync a consumer already has.
- **SDK advanced (has a backend):** app-data layer (query-sync) or an external system-of-record — decoupled, cross-doc-native, clean permissions.
- **dotcom:** the app-data layer on Zero is the option that _deletes_ the #1 risk rather than carefully de-risking it. It reopens the "dotcom = shape 1" call made in the other doc.

Net: the "parallel sync" instinct, chased to its end, isn't a second tldraw-sync — it's **comments as app-data on a query-sync layer**. That's the best architecture on the merits and the most infra-demanding one, which is exactly why it belongs as an option (and dotcom's likely pick), not as the SDK default.
