---
title: Sticker (shape, tool, and bindings)
component: ./StickerExample.tsx
priority: 0
keywords:
  [
    sticker,
    emoji,
    bindings,
    bindingutil,
    shapeutil,
    statenode,
    tool,
    child states,
    attach,
    stick,
    canbind,
    createbinding,
    onafterchangetoshape,
    ontranslateend,
    anchor,
    relative position,
    cursor,
  ]
---

An emoji sticker with a custom shape, tool, and bindings — drop a sticker on a shape and it sticks.

---

This example shows how to build a sticker that can be stuck onto other shapes. It brings together three of the main ways to extend tldraw: a custom shape (`ShapeUtil`), a custom tool (`StateNode` with child states), and a custom binding (`BindingUtil`).

Select the sticker tool and click to place a sticker, or press and drag to place it in one gesture. Drop a sticker on another shape and a binding attaches them, so the sticker follows the shape as it moves, resizes, or rotates. Drag the sticker off again to detach it.
