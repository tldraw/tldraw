---
title: Interaction end callback
component: ./InteractionEndExample.tsx
category: editor-api
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

Control behavior after dragging, resizing, or rotating shapes.

---

When programmatically starting interactions like translating, resizing, or rotating, you can use the `onInteractionEnd` option to control what happens when the interaction completes. Pass a string to transition to a specific tool, or a function to execute custom logic.

In this example, we set the fill of a shape after we finish translating to be patterned.
