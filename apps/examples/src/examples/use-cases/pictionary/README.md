---
title: Permissions — Pictionary
component: ./PictionaryExample.tsx
priority: 2
keywords:
  [
    permissions,
    multiplayer,
    collaboration,
    custom shape,
    side effects,
    role-based,
    visibility,
    getShapeVisibility,
    TLPermissionsManager,
  ]
multiplayer: true
---

A two-player Pictionary game demonstrating role-based and viewer-dependent permissions.

---

Two players share the same canvas in real time. One player is the **drawer**; the other is the **guesser**. `TLPermissionsManager` enforces:

- The **drawer** has full drawing permissions — they can create, move, and delete their own shapes.
- **Guessers** have zero permissions — they can only pan the canvas (hand tool); any shapes they attempt to create are immediately removed.
- The **word card** is visible only to the drawer — guessers cannot see it at all.
- The word card is **immutable** during a round — even the drawer cannot edit it through normal user actions. The host updates it between rounds via the host editor (PLAYERS[0] owns the card via `meta.__tldraw.createdBy`).

The word card's per-viewer visibility uses the `view.shape` permission rule wired through `getShapeVisibility`. The permission rule reads a reactive `atom` for the current drawer ID, so the editor's computed visibility cache invalidates automatically when the drawer changes between rounds.
