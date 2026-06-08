---
title: Ghost nodes (AI suggestions)
component: ./GhostNodesExample.tsx
priority: 2
keywords:
  [ghost nodes, ai, suggestions, canvas overlay, OnTheCanvas, local, ephemeral, camera, not synced]
---

Render low-opacity AI suggestions on the canvas that you can accept or dismiss.

---

"Ghost nodes" are AI suggestions drawn on the canvas as faint cards. Hover one to
bring it to full opacity, then **Add** it (which materialises a real shape) or
**Dismiss** it. Use the toolbar to generate more.

Two things make this work:

- **They're local, not part of the document.** The ghost nodes live in a plain
  `atom` (`ghostNodes$`), never in `editor.store`. So they don't sync to other
  users, don't persist, and won't even show up in another tab of the same
  document — they're a per-client overlay. Accepting a ghost calls
  `editor.createShape`, and _that_ shape is a normal document record that syncs and
  persists. (The example sets a `persistenceKey`: reload or open a second tab and
  the shapes you accepted are still there, but the ghosts are not.)
- **They respect the camera.** The cards are rendered through the `OnTheCanvas`
  component slot, which sits inside the camera transform. So you position each card
  in page coordinates and it scales with zoom and moves with pan automatically,
  just like a shape — no `pageToScreen` math. (`InFrontOfTheCanvas`, by contrast,
  pans but does not scale; a fixed screen-space control like the toolbar here is a
  plain absolutely-positioned element.)

Swap the seeded `SUGGESTIONS` for the output of a real model to drive the ghosts
from actual AI, and customise `acceptNode` to create whatever shape a suggestion
should become.
