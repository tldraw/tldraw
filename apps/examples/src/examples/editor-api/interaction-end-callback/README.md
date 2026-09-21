---
title: Interaction end callback
component: ./InteractionEndExample.tsx
priority: 4
keywords:
  [
    callback,
    interaction,
    drag,
    resize,
    rotate,
    tool,
    oninteractionend,
    translating,
    setcurrenttool,
    programmatic,
  ]
---

Run custom logic when a programmatically started drag ends with `onInteractionEnd`.

---

When a tool starts one of the select tool's interactions itself, for example `editor.setCurrentTool('select.translating', info)`, the `onInteractionEnd` field in `info` controls what happens when the interaction finishes. Pass a tool id string to report that tool as the current one while the drag runs (and return to it if tool lock is on), or a function to run arbitrary code.

This example's tool creates a square on click and immediately starts translating it. Click and drag anywhere: when you release, the callback changes the fill to a pattern and returns to the tool so the next click creates another square.
