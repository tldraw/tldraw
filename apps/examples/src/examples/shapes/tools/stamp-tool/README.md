---
title: Stamp tool
component: ./StampToolExample.tsx
priority: 3
keywords:
  [
    stamp,
    emoji,
    custom tool,
    statenode,
    assets,
    image shape,
    png,
    toppanel,
    picker,
    sticker,
    upload,
    drag,
  ]
---

Pick an emoji or upload an image, then click or drag on the canvas to stamp it as image shapes.

---

This example builds a stamp tool from a custom `StateNode`. A panel in the `TopPanel` slot lists the available stamps — clicking one activates the tool, and each click on the canvas places a stamp centered on the pointer. Holding the pointer down and dragging lays a trail of stamps spaced by the stamp size, and the whole drag undoes as a single step.

Every stamp is placed as an image shape backed by a shared asset created with `editor.createAssets`. Emoji stamps are drawn once to a PNG using a canvas element, which keeps them consistent in exports and across platforms; stamping the same stamp many times reuses a single asset.

The stamp options are plain data in an `atom` — to ship a new default stamp, add an entry to the array. The panel's upload button shows the runtime version: it reads an image file as a data URL, adds it as a new stamp option, and activates the tool with it.
