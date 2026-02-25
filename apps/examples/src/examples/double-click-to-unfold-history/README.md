---
title: Double click to unfold history
component: ./DoubleClickToUnfoldHistoryExample.tsx
category: editor-api
priority: 6
keywords: [history, undo, snapshot, fold, unfold, double-click, animation]
---

Double-click on fold ridges to restore previous canvas states.

---

This example demonstrates a visual history system using fold metaphors. Draw on the canvas, then click "Fold history" to save a snapshot as a fold ridge. Each fold captures the current state. Double-click any fold ridge to unfold back to that point in time, with an animation.
