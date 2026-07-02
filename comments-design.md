# Comments for the tldraw SDK

We want to add commenting to tldraw. tldraw.com will be the first product to use it, but tldraw is also an SDK that other developers build on — so every choice has to make sense both for us (where we control the whole stack) and for an outside developer (who may run things very differently).

This doc explains, in plain terms: the options for where comments live and how they sync, their pros and cons, the design questions that come up whichever option you pick, and what we've prototyped so far. Nothing here is a final decision. It's meant to be read on its own — no prior tldraw knowledge assumed.

---

## Key terms

- **Record** — one piece of data in tldraw (a shape, a page — and now a comment). Think of it as a row in a table.
- **Store** — tldraw's in-memory database on each person's device. It holds the records for whatever document is open and tells the app whenever anything changes.
- **Document data** — records that are both **saved and shared**: shapes, pages… and comments. This is "the document."
- **Presence** — records that are **shared but not saved**: cursors, selections, who's online. They travel over the same connection as the document, but they're per-person and disappear when you leave. Presence is _not_ part of the document.
- **Sync** — keeping the store in step across people and devices, so one person's change shows up for everyone.
- **tldraw sync** — the syncing system we provide. A developer can use it or bring their own.
- **Server** — where a document lives while people collaborate. With tldraw sync it's a small program (a "room") that receives each change and passes it on. On tldraw.com each file has its own server instance.
- **Zero / a per-user database** — separate from any single document, tldraw.com keeps a database of things that belong to _you_ across all your files (your file list, and your comments). It uses a tool called **Zero**, which can sync just the rows a person is allowed to see.

The document/presence distinction matters later: a comment is _document data_ (saved and shared), but whether _you have read_ a comment is personal — that's presence-like, and must not be saved-and-shared.

---

## A comment is a record — and what the SDK builds either way

**A comment is just a record, like a shape.** That's the idea everything follows from: comments can be saved, synced, and undone by the same machinery that already moves shapes, and whatever moves your document will move your comments.

No matter which option below you choose, the SDK provides the same building blocks:

- the **comment record** — the data shape (what it's attached to, who wrote it, the text, timestamps),
- a **manager** — create / reply / resolve / delete, plus reactive lookups ("comments on this shape," "comments in this document"),
- the **on-canvas UI** — a pin for each comment (placed by combining the comment's _anchor_ with its shape's current position), the thread popover, and the composer,
- **events** — a comment was added, edited, resolved, someone was mentioned.

The one thing that changes between options is **where the comment data lives and how it syncs** — and therefore where the manager and UI read their data from and send their writes to. For the built-in options the SDK reads and writes its own store (the manager is a thin layer over it); if you want to own the data, the SDK reads and writes through a small interface you implement (Option 3).

The SDK draws _default_ pins, popovers, and a composer, but — like everything in tldraw — these are **overridable components**: a developer can restyle them, swap in their own, or hide them entirely through the same mechanism tldraw already uses for its toolbar, menus, and panels (see "Overriding the comment UI" below). So both _who draws the pin_ and _where the comment data comes from_ are things a developer can change.

---

## The options

### Option 1 — Comments as document data

Comments are ordinary **document records**, in the same category as shapes. They ride whatever syncs the document, so they work with **tldraw sync, your own sync, or no sync at all** — you don't do anything special to move them.

This is the option we've prototyped so far (see the end of the doc), though we haven't committed to it.

Where the server _stores_ them is a sub-choice:

- **Inside the document file** — simplest; comments save and load as part of the document, no extra server work.
- **In a separate file next to the document** — comments still ride the document's sync (everything above still holds), but the server keeps them in their own file instead of inside the document. This keeps the document file clean and gives comments their own lifecycle. It needs a little help from the sync server (the ability to leave comments out of the saved document, and to notice when they change). This is the path the prototype takes.

Cross-document views ("all my comments across every file") aren't free here — comment data lives per-document, and no single document can answer that. You add it by **copying comments one-way into a per-user database** (the prototype uses Zero for this). That copy is an add-on to this option, not a different option.

**Who builds what:** the SDK owns the whole flow through the store. A developer keeping comments in the document file builds nothing extra. A product like tldraw.com adds the server pieces (separate storage + the copy).

**Pros**

- Works for _everyone_ — any sync or none — with no backend.
- Free offline and free undo/redo _for the drawing_ (direct comment actions are deliberately excluded from undo — see below), with comments staying attached to their shapes (deleting a shape can clean up its comments in the same step).
- Simplest possible thing for a developer.

**Cons**

- Comments live and die with the document.
- Storing them _inside_ the document file grows it over time (the separate-file sub-choice avoids this, at the cost of server support).
- Cross-document views need the extra per-user copy.

### Option 2 — Comments as their own sync category

Instead of being _document_ records, comments would be their **own kind of record**, sitting alongside document and presence as a third category the sync layer knows about. To the sync system, "comments" would be a first-class thing, separate from the drawing.

Why you'd consider it: separate storage becomes first-class rather than a server trick, and **comment-specific rules live in the sync layer** — for example "you can comment but not edit" (comment-only), or checking who wrote a comment, could be enforced at the category level instead of bolted on.

**What we'd build:** a new record category (a new "scope") inside tldraw sync, plus how it's stored and who's allowed to touch it. The record, manager, and UI stay the same as Option 1.

**Pros**

- Comments are first-class in sync: natural home for comment-only access and server-side checks.
- Separate storage and separate rules without special-casing.

**Cons**

- A big change to tldraw sync and a **new concept every developer has to learn** — a heavy price for something Option 1 already mostly delivers.
- We have not built this; it's the alternative to Option 1, listed for completeness.

### Option 3 — Comments in a backend you provide

Instead of tldraw owning the comment data, **you** own it — in your own database, or in a query-sync engine like Zero. tldraw still provides the UI and the interactions; you provide the storage and the syncing.

The way to support this is a small, **comments-shaped interface** the SDK renders against — reads (reactive): "give me the comments for this document / shape"; writes: create, reply, edit, resolve, delete. You implement it against your backend; the SDK draws the pins/popover/composer from the reads and calls the writes on user actions. Take **resolve**: the user clicks resolve → the SDK calls your `resolve(id)` → you write it to your backend → your backend propagates it → the SDK re-renders. All the tldraw-store plumbing (keeping things off the undo stack, avoiding echo loops) lives _inside_ the SDK, behind the interface — you never touch it.

What sits behind the interface is up to you, and it's the only real variation within this option:

- **Your own database (with your own sync).** For an existing comments product, or when comments must outlive the document / be searchable / meet retention rules in a system you control.
- **A query-sync engine (like Zero).** An engine that syncs "just the rows a person may see" across many documents. This makes **cross-document views native** — an inbox or "all my comments" is just a query, with no separate copy to keep in step. (It's what tldraw.com already runs for other per-user data.)

One way to think about this variation: it makes comments **app-level** rather than document-level — the app's database is the source of truth, and comments flow _into_ each canvas from there, instead of living in the document and being copied out. If "all my comments in one place" were the primary surface, this would fit it best. Note this is a choice about _where the truth lives_, not a new record category in sync — a document's sync connection only ever covers that one document, so nothing inside the sync layer can span files; only a system that already spans the app can.

**What we'd build to support this:** the interface itself, and wiring the UI/manager to read from and write to it instead of only the built-in store. It's a real chunk of SDK surface — worth building when there's genuine demand to own the comment data, not day one.

**Pros**

- Comments are independent of the document — queryable, retainable, searchable in a system you control.
- You keep tldraw's comment UI and interactions; you only own the data.
- With a query-sync engine behind it, cross-document features come for free.

**Cons**

- You own the hard part: storage, syncing, conflicts, access rules.
- Comments and shapes now live in different systems, so "is this pin's shape still there?" becomes a cross-system question.
- The query-sync path needs an engine you already run (most developers don't; we won't build one for them).
- We have not built this; it's the path for teams that want to own the comment data.

---

## Which option fits which use case

| You are…                                                                                           | Fit                                                                           |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| An SDK developer who just wants comments in your app (our sync or your own)                        | **Option 1**, stored in the document                                          |
| tldraw.com: in-document comments **and** a cross-document inbox, and we run the server             | **Option 1**, stored separately + a per-user copy ← _what the prototype does_ |
| A single-user / offline app                                                                        | **Option 1**, in the document, no server                                      |
| Wanting comment-only access and comment-specific rules enforced deep in sync                       | **Option 2** (at the cost of a big sync change)                               |
| A developer with an existing comments product / retention needs                                    | **Option 3**, backed by your own database                                     |
| An org already running a query-sync engine (Zero/Convex/…) wanting a cross-document inbox for free | **Option 3**, backed by that engine                                           |

The through-line: **Option 1 is the only one that works for everyone with nothing extra.** The others are steps you take when you want comments first-class in sync (2) or you want to own the comment data yourself (3).

---

## Where we're leaning

Not a final decision, but a clear lean: **Option 1 with the separate file and the one-way copy — what the prototype does.** The document stays the source of truth; the cross-document view is a read model derived from it.

The real fork we weighed is where the truth lives. The alternative — comments **app-first**, with the app's database authoritative and the canvas reading from it (Option 3 backed by a query-sync engine) — makes the cross-document inbox native and lets comments outlive files. We're not taking it, for three reasons:

- **Staleness is invisible in an inbox and glaring on a canvas.** Nobody notices a comment reaching the inbox half a second late; everyone notices a pin lagging behind its shape, or an undone shape deletion that doesn't bring its comments back. App-first pays a permanent consistency cost on the core surface (the canvas) to make the secondary surface (the inbox) native — the wrong direction to spend.
- **The SDK needs Option 1 anyway.** It's the only default that works for a developer with no backend, so the store-record machinery — atomic shape-delete cleanup, offline, the undo interplay — gets built regardless. If tldraw.com went app-first, the default path every other developer takes would ship without a serious first user.
- **The anchor lives in the document.** A canvas comment is defined by what it's attached to. Keep comment and shape in one store and "is this pin's shape still there?" is a lookup in one transaction; split them across systems and the single most common question becomes a consistency problem.

The honest weak spot of this lean is **writing from the inbox** — resolving or replying from the cross-document view without the file open means reaching back into the document (a lightweight connection, or a server-side write into it). That's real work, but bounded and deferrable: a read-only inbox is a fine first version. The app-first weaknesses (undo, offline, orphaned pins) are the opposite — day-one and structural.

Option 3 stays on the map as what it is: a future interface for teams that genuinely need to own their comment data, not the architecture we start from.

---

## How common features work under each option

Several things swing on which option you pick. Here they are side by side — "store-backed" covers Options 1 & 2 (comments as tldraw records); "your backend" is Option 3 (you own the data behind an interface).

| Feature                                         | Store-backed (Options 1 & 2)                                                                      | Your backend (Option 3)                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **In-file sidebar** (the open doc's comments)   | an SDK component reads the store; ships out of the box                                            | the same component, reading through the interface                                  |
| **Cross-file sidebar** ("all my comments")      | not answerable from the doc — needs a per-user copy to read from                                  | your backend answers it (a native live query with a query-sync engine)             |
| **Notifications**                               | a server-side hook watches comment changes → you derive who to notify and deliver it              | your backend derives them on write (it owns the write path)                        |
| **Validation** (author, mentions, comment-only) | needs a before-accept gate on the sync server — _not built yet_                                   | in your backend, where you already authenticate and check access                   |
| **Undo / redo**                                 | comment actions are deliberately kept off tldraw's undo stack                                     | not in tldraw's undo at all; your backend owns any history                         |
| **Consistency**                                 | one store at runtime; the per-user copy is strictly one-way (the document is the source of truth) | the SDK reconciles its view with your backend, the source of truth                 |
| **Offline**                                     | free — the store persists locally and re-syncs                                                    | depends on your backend                                                            |
| **Delete a shape with comments**                | its comments are cleaned up in the same store transaction (undo restores them)                    | cross-system: your backend must be told, or you tolerate dangling pins until it is |

**Option 2** behaves like Option 1 throughout this table, except it makes the sync-layer concerns — validation and separate storage — first-class rather than bolted on.

Several of these have more behind them than a cell holds — why comments dodge undo, how the one-way copy stays consistent, exactly what validation checks. Those details are in Design considerations, next.

---

## Design considerations

These come up whichever option you pick — they're the questions we actually worked through.

### The comment record

A comment stores what it's attached to (its _anchor_), who wrote it, the text, and timestamps. The anchor is built to grow: today it points at a shape, but the same field can later point at a page, a free spot on the canvas, or a whole document. A comment is document data — saved and shared — unlike presence.

### Threads and replies

A comment can start a thread others reply to. The intended model is _single-level_: one opening comment plus a flat list of replies, no replies-to-replies. That keeps the data and UI simple and covers almost every real conversation; replies show in the order written. (The first version ships flat comments, threading layered on afterward.)

### Resolving

A thread can be _resolved_ — marked done — and reopened. Resolved threads are usually hidden or filtered out so settled discussions don't clutter the canvas. Resolved-ness is a property of the thread, so it's shared with everyone. Who may resolve is a permission question (by default anyone with access).

### Read and unread

Whether _you_ have seen a comment is personal — it must not be saved-and-shared the way the comment is. So read state lives per-person, outside the document. The cheap model is a **last-read watermark**: one timestamp per person per thread, and "unread" means "comments newer than my watermark." That avoids a write per comment — you only stamp the watermark when someone opens a thread.

Where the watermark lives is the same per-user split as everything else:

- **Options 1 and 2.** The comment is shared document data, so read state can't ride with it. Two homes: **session scope** — tldraw's local-only, per-device store — which is free and needs no backend but doesn't follow you across devices (read on your laptop, still unread on your phone); or a **per-user store** (tldraw.com's per-user database) for cross-device read state, which is a second data path you add, just like the cross-document view. Either way an "unread" pin joins two sources on the client: the comment (from the document) and your watermark (from wherever you kept it). Option 2 is no different — the comment scope is still shared, so read state still lives outside it.
- **Option 3.** Read state is just more per-user data in the same backend as the comments, keyed by (user, thread). "My unread" is one query where they already sit together — and with a query-sync engine it's a live one. No second path, no client-side join.

### Who can see a comment

By default a comment is visible to everyone who can open the document. Finer-grained visibility (private threads, or comments only mentioned people can see) is a possible extension, not part of the basic model — it would mean a per-comment visibility setting and filtering on the way in.

### Turning comments on, and keeping both ends in step

Comments are opt-in, not part of tldraw's built-in data — adding a record type to the defaults is a permanent commitment for every tldraw document ever, and forces the feature on people who don't want it. Because sync requires both ends to agree on what records exist (to validate and, across versions, upgrade them), the comment type must be registered in the app _and_ on its server — like a custom shape. Register only one side and sync rejects the records. Registration happens where the store is created: a `comments` switch on `<Tldraw>` if it builds the store for you, or in your own store setup if you build it (for your own sync).

### Side effects (one change triggering another)

Some changes should automatically cause others: delete a shape, and its comments should go with it. tldraw's store has a built-in system for exactly this — you register a handler (`editor.sideEffects.registerAfterDeleteHandler('shape', …)`, with matching hooks for create and change) that runs **inside the same transaction** as the change that set it off. Comments use it: a handler on shape deletion removes the comments anchored to that shape. Because it's one transaction, the cleanup is atomic and rides the shape's undo — undo the deletion and the comments come back. This is the "side effect" the undo, deleting, and consistency notes all lean on.

How this plays out depends on the option:

- **Options 1 and 2 get it for free, and identically.** A comment is a store record either way (Option 2's separate scope is still the same runtime store), so the handler removes anchored comments in the same transaction as the shape — atomic, undoable, and synced like any other change. The multiplayer wrinkle: the handler is told whether the change was **local or remote**, and you run the cascade only for _local_ deletes so other clients don't redo the same work. On tldraw.com the cascaded deletions ride the normal comment path into the per-user copy, so the cross-document view stays in step too. A load-time sweep (see below) is the backstop for anything an offline client missed.
- **Option 3 can't be atomic.** The shape is in tldraw's store but the comment is in your backend — two systems, so one transaction can't span them. The SDK still detects the shape deletion and finds the anchored comments through your interface's reads, but from there you either have its shape-delete handler call your `delete` (best-effort like the one-way copy, and no longer coupled to tldraw's undo — undoing the shape won't resurrect the comment unless you handle that), or you skip the cascade and let pins whose shape is gone drop out at render time, reconciling later. That's the "cross-system" note in the table's delete row.

### Undo and redo

Subtle in multiplayer. Undo is _local_ (Ctrl+Z reverts _your_ last action), but comments sync to everyone, so a naive approach causes two bugs: **resurrection** (an unrelated Ctrl+Z brings back a comment you deleted, for everyone) and **overwrite** (your Ctrl+Z clobbers a teammate's newer edit). There's also the plain expectation that Ctrl+Z takes back _drawing_, not a discussion. So **adding, editing, or deleting a comment is not on the undo stack** (matching Figma/FigJam). One nuance: when comments are cleaned up as a _side effect_ of an undoable action — deleting a shape that has comments — that cleanup rides the shape's undo, so undoing the shape deletion brings its comments back. Only _direct_ comment actions sit outside undo.

### Deleting shapes, comments, and pages

- **Delete a shape with comments** → its comments are removed by default (keeping them as free-floating pins is an option). Because shape and comments share one store, this is one step — which is why undoing the delete can bring them back.
- **Delete the opening comment of a thread** → deletes the whole thread; since that's destructive and not undoable, the UI confirms first. (Keeping replies under a "deleted" placeholder, or promoting a reply to opener, were considered and set aside.)
- **Delete a page** → its comments go with it.
- **Coming back online** → if a teammate deleted a shape while you were away, a check on load sweeps up comments pointing at shapes that no longer exist.

### Keeping things consistent

**Within the document.** At runtime, comments and shapes live in the _same_ store — even on tldraw.com, where they're saved to different files, the split is only about storage, not runtime. So "delete a shape, remove its comments" runs in one transaction over one store: atomic, and it syncs like any change. A load-time check is the backstop for anything missed (offline merges, a client that didn't run the side effect).

**With a copy (like tldraw.com's per-user database).** We keep it simple by making the copy strictly **one-way**: the document is the source of truth, the copy only follows — nobody edits comments in the copy. Each change is an idempotent upsert/delete keyed by comment id, so retries and reordering are harmless. The copy is best-effort and never blocks the document; if a write fails, the document is still correct and the copy is briefly behind. Because the document holds the authoritative set, the copy can always be rebuilt from it — a reconciliation (periodically, or when a file's server restarts) re-derives and upserts, healing drift. There's one source and one follower, never two equals to reconcile.

### Who can do what

Comments come with permissions. A common case is **comment-only** access — a reviewer who can add comments but not change the drawing. Guest/anonymous commenting can be enabled as a setting. Enforcing all of this (including "post only as yourself") is a server job, next.

### Validating comments

Comments arrive from people's browsers, so the server can't take them at face value — a tampered client could post as someone else or mention people who shouldn't be pinged. The server needs to check comment writes:

- **Post only as yourself** — the author on an incoming comment must match the signed-in user (or a guest id the server itself assigned); a comment claiming a different author is rejected.
- **Mention only people who can see the file** — the server works out mentions from the comment text (not a browser-supplied list) and only notifies people who actually have file access, so nobody can spam strangers or expose a file by mentioning them.
- **Enforce comment-only** — the same check is where a comment-only person's shape edits are rejected while their comment writes are allowed.

This needs the sync server to inspect and reject a write _before_ accepting it (tldraw sync would expose a hook; on your own sync you'd do it on your server). **This isn't built yet:** today the author is set by the browser and taken as-is, and there's no mention checking — it's the main missing piece before comments are safe for untrusted, multi-user use.

### Overriding the comment UI

tldraw already lets developers override any part of its interface by handing `<Tldraw>` a replacement component for a named slot (or `null` to hide it). That covers the canvas-level pieces — background, grid, and what's drawn _on_ and _in front of_ the canvas — and the UI-level pieces — toolbar, menus, style panel, share panel, dialogs, toasts, and so on.

The comment pieces — the pin, the thread popover, the composer, a comments sidebar — plug into this same system. So a developer can take our defaults as-is, restyle them, replace any single one with their own, or hide them and build a fully custom comment surface while still using our data and events underneath. The default pins are drawn in front of the canvas and positioned on their shapes; overriding a pin is no different from overriding the toolbar.

### Reacting to comments, and notifications

The SDK surfaces events (added / edited / resolved / mentioned). An app hangs its own behavior off them — email, an inbox, a channel ping. The SDK provides events; delivery is the app's job. A typical order is an **in-app inbox and unread badges first** (events + read state), then **email or digests later** (which also needs per-person preferences and batching, so people aren't emailed on every reply).

### Where the code lives

Open question: comments as a **separate installable package** vs **part of the main tldraw package**.

- **Separate package** — opt-in, no bundle cost if unused, released on its own schedule (there's precedent: the Mermaid integration is a separate package on top of tldraw). Costs the developer more setup: install, register records, add UI, wire it up.
- **Part of tldraw** — a single `comments` switch on `<Tldraw>` turns it all on in one line, because `<Tldraw>` builds the store. Costs bundle size for everyone and ties comments to tldraw's release cadence; fits tldraw's "batteries included" nature.

Leaning: in-package but opt-in (a switch, off by default). Either way, the comment _record_ is UI-free and belongs in the low-level schema package (so a server with no screen can use it); the on-screen pieces live in the UI package.

### Likely later

Deliberately deferred, none changing the core model: email/digest notifications; formatted text and @mentions in the body; attaching a comment to a _range of text_ inside a shape; and different _kinds_ of comment (a suggestion vs a plain note).

---

## What we've prototyped so far

To explore **Option 1** — comments as document data — we built a prototype and wired tldraw.com on top of it. This isn't a commitment to ship; it's how we tested the approach end to end:

- **Comments sync through tldraw sync like any record.** Add one and collaborators see it; it persists with the file; it behaves like a shape.
- **tldraw sync gained two small, general-purpose abilities** for the separate-storage part: it can leave chosen record types _out_ of the saved document, and it can notify the server the moment a change commits. Neither is comment-specific, and both do nothing unless a server opts in.
- **The per-file server stores comments in a separate file** next to the document (not inside it), and loads them back when the file opens — so the document file stays clean.
- **The same commit notification copies each comment one-way into the per-user database** (a Postgres table Zero replicates to the right people), so a **cross-document comments page** lists everyone's comments across their files without opening each one.
- **In the app:** select a shape and type a comment → a pin appears; click a pin to read it. A **comments page** lists everything newest-first; clicking an entry opens the file, jumps to the shape, and opens that comment.

A developer **not** using tldraw sync needs none of the server pieces — they get comments as records that ride their own sync (Option 1 in the document), and can move to Option 3 (own the data) later.

**Honest status:** the validation above (posting as yourself, mention checks) is **not built** — today the author comes from the browser. Threads, resolve, read/unread, and rich text aren't built yet either; the current version is flat, plaintext, shape-anchored comments. Those are design decisions captured above, not shipped features.
