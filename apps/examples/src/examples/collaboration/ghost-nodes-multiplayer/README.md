---
title: Ghost nodes (multiplayer)
component: ./GhostNodesMultiplayerExample.tsx
priority: 3
keywords:
  [
    ghost nodes,
    ai,
    suggestions,
    multiplayer,
    sync,
    useSyncDemo,
    local,
    not synced,
    OnTheCanvas,
    presence,
  ]
multiplayer: true
---

The multiplayer version of the ghost nodes example — suggestions stay local.

---

This is the [ghost nodes](/ghost-nodes) example wired to real multiplayer sync via
`useSyncDemo` (tldraw's hosted demo backend). It proves, over an actual network,
that the AI suggestion "ghost nodes" never sync.

Open this example in **two browsers** (or share the room URL with someone). Then:

- **Generate suggestions** in one browser — the ghost cards appear only there. They
  live in a local `atom` (`ghostNodes$`) that is never written to the synced store,
  so the other browser sees nothing.
- **Accept** a ghost (hover → **Add**). That calls `editor.createShape`, a normal
  document record, so the resulting shape syncs to everyone in the room.

The takeaway: keep ephemeral, per-client UI (suggestions, hovers, drafts) in plain
signals or React state, and only write to the editor's store when you want
something to become part of the shared, synced document. The ghost cards render
through the `OnTheCanvas` slot, so they scale and pan with the camera like shapes.
