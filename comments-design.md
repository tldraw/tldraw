# Comments for the tldraw SDK

We want to add commenting to tldraw. tldraw.com will be the first product to use it, but tldraw is also an SDK that other developers build on — so every choice has to make sense both for us (where we control the whole stack) and for an outside developer (who may run things very differently).

This doc explains, in plain terms, the ways comments can be stored and synced, with the pros and cons of each. It's written to be read on its own — no prior tldraw knowledge assumed.

---

## Key terms

- **Record** — one piece of data in tldraw (a shape, a page — and now a comment). Think of it as a row in a table.
- **Store** — tldraw's in-memory database on each user's device. It holds all the records for whatever document you have open, and tells the app whenever anything changes.
- **Document** — one tldraw file: its shapes, pages, etc. (all the records that make up the drawing).
- **Sync** — keeping the store in step across people and devices, so when one person changes something, everyone sees it.
- **tldraw sync** — the syncing system we provide. A developer can use it, or bring their own.
- **Your own sync** — a developer using their own system to move document data between users, instead of tldraw sync.
- **Server** — wherever a document lives when people collaborate. With tldraw sync this is a small program (a "room") that receives each change and passes it on. On tldraw.com each file has its own server instance.
- **tldraw.com's per-user database** — separate from any one document, tldraw.com keeps a database of things that belong to _you_ across all your files (your file list, and now your comments/notifications). It's built on a tool called **Zero**, which can sync just the rows a person is allowed to see.

---

## The one idea everything follows from

**A comment is just a record, like a shape.** Once you accept that, a lot falls out for free: comments can be saved, synced, and undone by the exact same machinery that already moves shapes around. Whatever moves your document data will move your comments too.

The whole design then comes down to **two questions**:

1. **Where do the comments live?** Inside the document (alongside the shapes), or in a separate system the developer owns?
2. **What moves them around?** tldraw sync, the developer's own sync, or nothing at all (a local, single-user file)?

The rest of this doc walks through the sensible answers.

---

## Approach 1: Comments live in the document

The comments are part of the document, sitting right next to the shapes. Because they're ordinary records, they travel wherever the document travels — you don't do anything special to sync them.

This one approach already covers three very different setups:

- **Using tldraw sync** → comments sync between collaborators automatically. Nothing extra to build.
- **Using your own sync** → comments ride _your_ sync automatically, the same way your shapes do. You don't have to teach your system about comments specifically; to it, a comment is just another record.
- **No sync (a local, single-user file)** → comments are saved with the file and work offline. No server needed.

**Pros**

- Simplest possible thing for a developer: it "just works" with whatever they already have.
- Free offline support, free undo/redo, and comments stay correctly attached to their shapes (delete a shape and its comments can be cleaned up in the same step).
- Works for _everyone_, including people with no server at all.

**Cons**

- Comments are tied to the document's life. If the document is deleted, the comments go with it.
- The comment text lives inside the document file, which can grow over time.
- It can't, by itself, answer "show me all my comments across every file" — that needs data outside any single document (covered below).

---

## Approach 2: Comments live in the developer's own system

Here the developer keeps comments in _their own_ database, not in the tldraw document. tldraw still shows the comments and provides the UI, but the developer's system is the real home for the data. tldraw's store becomes a live mirror of it.

To make this work, the developer wires up two directions:

- **Read in:** when their database changes, they load those comments into tldraw's store so the UI shows them.
- **Write out:** when someone adds or edits a comment in the tldraw UI, they send that change to their database.

**When you'd want this**

- You already have a comments product or database and want tldraw's comments to be backed by it.
- Comments must outlive the document, be searchable, or satisfy retention/compliance rules that require them in your own controlled system.

**Pros**

- Comments are independent of the document — they can outlive it and be queried on their own.
- You still get tldraw's built-in comment UI; you're only swapping out where the data is stored.
- Uses tldraw's normal public APIs, so there's no special "comments backend" to design.

**Cons**

- You take on a real two-way syncing problem: keeping your database and tldraw's store agreed, handling conflicts, and undoing failed writes. This is genuine work.
- Offline is harder — if your system is unreachable, the comments can't be trusted.
- Keeping comments correctly attached to shapes is now your responsibility, because your system doesn't know about tldraw shapes.

This is really "Approach 1 plus two wires you add yourself," so it's an opt-in step up, not a different product.

---

## Approach 3: A per-user database for cross-document views ("all my comments")

Some features can't be served by looking inside a single document — for example, an inbox or a page that lists **all your comments across all your files**. You can't open every file to find them. That information has to live in a per-user place.

tldraw.com already has exactly such a place (its per-user database, built on Zero). There are two ways to use it:

**3a. Comments live in the document, and a copy is also written into the per-user database.**
The document is still the real home for a comment. In addition, tldraw.com's server notices new comments and writes a copy into the per-user database, which then syncs to the right people. Comments sync normally inside the file, _and_ a copy flows to the per-user database so the cross-document "all my comments" view works.

**3b. Comments live _only_ in the per-user database.**
No copy in the document at all. This is the cleanest version for cross-document features (the inbox is just a query), but it needs a special kind of sync engine — one that can sync _just the rows a person is allowed to see_, across many documents, rather than a whole document at a time. tldraw.com has this (Zero); most outside developers don't, and we're not going to build one for them.

**Pros**

- The only way to do cross-document features (inbox, "all my comments," notifications) well.
- For tldraw.com specifically, 3b would make those features almost free and remove a lot of server complexity.

**Cons**

- Needs that special per-user, permission-aware sync engine. For an outside developer without one, this approach is effectively off the table.
- 3a keeps comments in two places at once (the document and the per-user copy). That duplication is fine and expected, but it is two places.

---

## An approach we considered and set aside

- **A second, parallel tldraw-sync connection just for comments.** It sounds tidy, but a per-document comment connection still can't answer cross-document questions, so you'd pay for a second connection and _still_ need the per-user database from Approach 3. It doesn't earn its keep.

---

## Quick summary: who owns the data × what syncs it

| Setup                                | Comments in the document (Approach 1) | Comments in your own system (Approach 2) | Per-user database (Approach 3)                |
| ------------------------------------ | ------------------------------------- | ---------------------------------------- | --------------------------------------------- |
| **Using tldraw sync**                | ✅ works out of the box               | ✅ you add the two wires                 | tldraw.com only (needs the per-user database) |
| **Using your own sync**              | ✅ rides your sync automatically      | ✅ you own storage and sync              | needs a per-user, permission-aware engine     |
| **No sync (local file)**             | ✅ saved with the file, offline       | ✗ needs a backend                        | ✗ needs a backend                             |
| **Cross-document "all my comments"** | needs a copy in a per-user database   | your database can answer it              | ✅ this is what it's for                      |

One thing the table shows: **keeping comments in the document is the only setup that works for everyone with nothing extra.** Storing them in your own system, or in a per-user database, are steps a developer adds when they own a backend or need cross-document features.

---

## How tldraw.com uses comments

tldraw.com combines the first and third approaches:

- **Comments are records in the document**, so they sync between collaborators through tldraw sync with no extra effort.
- On **tldraw.com's server**, comments are saved to a **separate file next to the document** rather than inside the main document file, so the document file stays clean and comments can have their own lifecycle. When the file is reopened, those comments are loaded back in.
- The server **also copies comments into the per-user database** as soon as they're added, so a **cross-document comments page** can list all of a person's comments across their files.
- In a file: select a shape, type a comment, and a pin appears. The comments page lists everything newest-first, and clicking an item opens the file and shows that comment.

A developer **not** using tldraw sync needs none of these tldraw.com-specific server pieces — they get comments as records that ride their own sync (Approach 1), and can add their own backend later for Approach 2 or 3.

---

## Choosing an approach

There's no single right answer — it depends on what a developer has and needs:

- Want comments to work with no backend, on any sync or none? Keep them in the document (Approach 1).
- Already have a comments database, or need comments to outlive the document? Store them in your own system (Approach 2).
- Need cross-document views like an inbox or "all my comments"? Use a per-user database (Approach 3).

These aren't mutually exclusive: keeping comments in the document is the foundation, and the other approaches build on top of it. tldraw.com's own setup — comments in the document, copied into a per-user database — is one point in this space, chosen because tldraw.com already runs a per-user database.

---

## Decisions already made

- **Comments are opt-in, not part of tldraw's default data.** Adding a new record type to the defaults is a permanent commitment for every tldraw document ever, so developers turn comments on rather than getting them forced on. (Both the app and its server must turn them on together, the same way a custom shape must be registered on both ends.)
- **Undo:** adding or editing a comment is _not_ undone by Ctrl+Z (that avoids surprises in multiplayer, like a comment reappearing after someone deleted it). Deleting a shape _can_ bring its comments back, because that happens as part of undoing the shape deletion.
- **Deleting a shape** removes its comments by default (configurable to keep them instead).
- **Identity and permissions:** a comment's author is set by the server, not trusted from the browser. A person can be allowed to comment on a document without being allowed to edit it. Anonymous/guest commenting is supported behind a setting.
- **Notifications** (email, digests, etc.) are left to whoever uses the SDK — we provide the events, not the delivery.
