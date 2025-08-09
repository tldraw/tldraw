---
title: Lasso select tool
component: ./LassoSelectToolExample.tsx
category: editor-api
priority: 3
keywords: [tools, state machine, custom tool, selection, lasso, overlays, editor atom, freehand drawing]
---

Add a lasso select tool to tldraw.

---

You can build selection tools in tldraw with different behavior than the default select tool. This example creates a lasso select tool that lets you freehand draw to select shapes on the canvas. It uses the `EditorAtom` to reactively store the lasso points, and an `Overlay` to draw the lasso onto the canvas.
Only shapes that are fully enclosed in the lasso will be selected.