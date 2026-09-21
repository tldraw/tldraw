---
title: Custom tool (screenshot)
component: ./ScreenshotToolExample.tsx
priority: 0.5
keywords:
  [
    custom tool,
    statenode,
    screenshot,
    export,
    state machine,
    child states,
    brush selection,
    dragging state,
    overrides,
    toolbar,
    asset urls,
  ]
---

A custom tool with child states that exports a dragged-out area of the canvas as a PNG.

---

Tools are `StateNode`s in tldraw's state chart, and this one has three child states: idle, pointing, and dragging. The dragging state keeps the box being drawn in an atom, which an `InFrontOfTheCanvas` component reads to draw the box over the canvas, and on pointer up it calls `exportAs` (or `copyAs` when ctrl is held) with `bounds` set to the box.

The example also shows the wiring a new tool needs: the `tools` prop, a `TLUiOverrides` entry so the UI knows the tool's label, icon, and shortcut, a custom icon via `assetUrls`, and a `Toolbar` override that adds the item.

Try selecting the screenshot tool (or press J) and dragging over some shapes. Hold shift for a 16:9 box, alt to center it on the start point, and ctrl to copy to the clipboard instead of downloading.
