---
title: Editable custom shape
component: ./EditableShapeExample.tsx
priority: 2
keywords: [editing, canedit, double click, interactive, emoji picker, shape state, editing state]
---

A custom shape that becomes interactive when you double-click it.

---

The editor has at most one editing shape at a time. While a shape is being edited it can't be dragged, resized, or rotated, and pointer events reach its content. Only shapes whose util returns true from `canEdit` can enter this state; the user gets there by double-clicking the shape or selecting it and pressing Enter, and leaves it with Escape or by clicking the canvas.

The default shapes mostly use editing for text, but it's a general mechanism. This example's shape shows an emoji, and while editing it shows a button that cycles to the next emoji with `editor.updateShape`. The component reads `editor.getEditingShapeId()` to decide what to render, turns on `pointerEvents` only while editing, and marks pointer-down events as handled so clicking the button doesn't start a drag. `onEditEnd` spins the shape when editing finishes.

Try double-clicking the shape, clicking Next a few times, then pressing Escape. The relevant code is in `EditableShapeUtil.tsx`; for a walkthrough of the shape util basics, see the custom shape example.
