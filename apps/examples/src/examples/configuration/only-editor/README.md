---
title: Minimal
component: ./OnlyEditorExample.tsx
priority: 100
keywords:
  [tldraweditor, minimal, bare bones, custom ui, no ui, headless, shapeutils, tools, statenodeonly]
---

Use `TldrawEditor` on its own with one custom shape and one custom tool, and no UI.

---

`TldrawEditor` is the editor without tldraw's default shapes, tools, or UI. You provide everything: here that's a single box shape (`MiniBoxShapeUtil`) and a small select tool (`MiniSelectTool`) built as a `StateNode` with idle, pointing, and dragging child states.

Double-click the canvas to create a box, double-click a box to delete it, click or shift-click to select, and drag to move. `MicroSelectTool.ts` in the same folder shows an even smaller select tool with no child states; it isn't used by the example but is a good starting point for reading.

For a fuller custom shape and tool, see the custom config example. For the pieces the `Tldraw` component adds on top of `TldrawEditor`, see the sublibraries example.
