# Multiplayer through tldraw sync, with backgrounds stored in object storage

The app is collaborative. Each canvas is a [[Room]] (the room id is in the URL); everyone
who opens the link shares one synced tldraw document — [[Marketing asset]]s, [[Brand
guidelines]], [[Version]]s, and [[Annotation]]s — with live cursors. This replaces the
single-browser IndexedDB persistence the template started with (`persistenceKey`).

We use tldraw's first-party sync stack rather than rolling our own transport. The client
connects with `useSync`; the backend is one Cloudflare Durable Object per room
(`TldrawDurableObject`), reusing the existing worker — the same worker still serves the
`/api/generate` and `/api/plan` AI routes. The Durable Object holds the room with WebSocket
Hibernation, persisting room state to its SQLite storage, exactly as the canonical
`sync-cloudflare` template does. This is the supported, batteries-included path: presence,
hibernation, and snapshot persistence come for free, and the room schema is just the tldraw
schema plus our one custom shape.

The room schema must match the client's. The worker builds it with `createTLSchema` from the
default shapes **plus** the custom `marketing-asset` shape, and the default bindings —
the latter matters because the [[Annotate tool]] connects its arrows with arrow bindings, so
a room without bindings would reject every annotation. To share the shape's validators with
the worker without dragging the whole `tldraw` package into the worker bundle, `assetShape.ts`
imports `T` from `@tldraw/validate` (a tiny, worker-safe dependency) and takes its `tldraw`
types as `import type` only.

[[Background]] bytes are **not** synced inline. The image model returns a full-resolution PNG
as a data URL; embedding that on the asset record would push multi-megabyte strings through
the room and into the room's storage on every generation. Instead we upload the bytes to an
R2 bucket (`/api/uploads`) and keep only the URL on the synced document — the same
`TLAssetStore` pattern `useSync` expects for user-dropped media, extended to cover the
programmatically generated backgrounds. The one cost is that a [[Re-render]] that edits the
background must read the stored image back from its URL into a data URL before handing it to
the image model; the model's input is otherwise unchanged.

Going multiplayer also changed how an interrupted generation is recovered. In single-player,
any asset found in the `generating` state on load was simply reset — safe, because only one
client existed. In a room a peer may be **actively** generating, so a blind reset would abort
its render. Each generation now writes a heartbeat timestamp (`generatingStartedAt`) that it
refreshes while it runs; on load we only reset assets whose heartbeat has gone stale. An
active render keeps itself alive; a render whose client went away ages out and is recovered.

## Considered options

- **Keep IndexedDB, no multiplayer.** Simplest, but the brief is collaboration. Rejected.
- **Sync the backgrounds inline in the document.** No R2, fewer moving parts, but every
  generated PNG would be a large data URL replicated to every client and stored in the room;
  this bloats the document, slows joins, and risks message-size limits. Rejected.
- **A separate sync server (not the existing worker).** More to deploy and reason about; the
  worker already exists and the Durable Object slots into it cleanly. Rejected.
- **Reset every `generating` asset on load (the old behaviour).** Correct in single-player,
  but in a room it cancels a peer's in-flight render. Replaced by the stale-heartbeat check.
