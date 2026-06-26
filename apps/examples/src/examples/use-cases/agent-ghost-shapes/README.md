---
title: Agent ghost shapes
component: ./AgentGhostShapesExample.tsx
priority: 2
keywords:
  [
    agent,
    ai,
    ghost shapes,
    suggestions,
    proposed changes,
    staging,
    accept,
    reject,
    OnTheCanvas,
    streaming,
    not synced,
  ]
---

Render proposed agent changes as ghost shapes on the canvas, then accept or reject them.

---

This example combines two patterns. The first is an **ephemeral on-canvas overlay**: proposals live in
a plain `atom` (`proposals$`), never in `editor.store`, and are rendered through the `OnTheCanvas` slot
so they sit in page space and scale and pan with the camera. The second comes from the **tldraw agent
starter kit**: a streaming, structured action vocabulary, where the agent emits a stream of `create`,
`update`, and `delete` actions, each folded into the canvas through a small action registry.

The key move is that actions are applied to a **staging layer**, not to the document. A proposed
change is a ghost until you accept it:

- **Create** proposals render a preview of the new shape. For built-in kinds (ellipse, arrow, …) that
  is a dashed approximation; for `ui` kinds it is the **real React UI component** — the agent proposes
  a custom `ui-component` shape (a button, an input, a card, a checkbox, an avatar, …), and the ghost
  renders the exact same `UIComponent` it will become on accept, just dimmed and framed.
- **Update** and **delete** proposals draw a halo (or a struck-through halo) over an existing real
  shape, tracking it live.
- **Accept** materializes the proposal into a real shape via `editor.createShape` / `updateShape` /
  `deleteShapes` (a normal document record that syncs and persists), then drops the ghost. **Reject**
  just drops the ghost; nothing was ever written to the store.

Type a prompt (try "login screen", "flowchart", or "tidy up"), press **Run demo**, or use **Accept
all** / **Reject all**. Open a second tab on the same `persistenceKey` to confirm: accepted shapes are
there, ghosts are not.

Two things to know about the trade-offs:

- **Custom shapes preview exactly; built-in shapes are approximated.** A custom `ui-component` shape
  (in `UIComponentShape.tsx`) shares one presentational `UIComponent` between its `ShapeUtil.component`
  and the ghost preview, so what you preview is what you get. Built-in kinds are drawn with bespoke SVG
  in the overlay, since the real `ShapeUtil` render only exists once a shape is in the store — that is
  the cost of keeping proposals truly not-yet-real. If you would rather preview built-ins
  pixel-accurately, apply them to the store immediately and reverse the change on reject with
  `reverseRecordsDiff` — which is how the agent starter kit's chat-panel diff viewer works.
- **The driver is pluggable.** `mockStream` (in `agentStream.ts`) ships scripted scenarios so the
  example runs with no API key. Swap in `realStream` and point it at your own backend — or the agent
  starter kit's worker — to drive the ghosts from a real model. The example never handles API keys
  itself; the key stays on your server.
