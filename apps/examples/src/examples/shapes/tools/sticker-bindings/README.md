---
title: Attach shapes together (bindings)
component: ./StickerExample.tsx
keywords:
  [
    bindings,
    bindingutil,
    relationships,
    attach,
    stick,
    canbind,
    createbinding,
    onafterchangetoshape,
    anchor,
    relative position,
  ]
priority: 10
---

Stick a sticker shape onto other shapes with a custom binding that keeps it attached.

---

Bindings are records that connect two shapes; a `BindingUtil` decides what happens when either side changes. Here a sticker dropped onto a shape creates a `sticker` binding storing where on the target it landed. `onAfterChangeToShape` moves the sticker as the target moves, resizes, or rotates, and `onBeforeDeleteToShape` deletes the sticker with its target.

Draw a shape, pick the sticker tool (or press P), and drop a sticker on it. Then move or resize the shape and watch the sticker stay put. Drag the sticker off to unstick it.
