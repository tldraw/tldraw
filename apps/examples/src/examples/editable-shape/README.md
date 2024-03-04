---
title: Editable shape
component: ./EditableShapeExample.tsx
category: shapes/tools
priority: 2
---

A custom shape that you can edit by double-clicking it.

---

In Tldraw, the Editor can have one editing shape at a time. When in its editing state, the editor will ignore events until the user exits the editing state by pressing Escape or clicking on the canvas.

Only shapes with a `canEdit` flag that returns true may become editable. A user may begin editing a shape by double clicking on the editable shape, or selecting the editable shape and pressing enter.

Many of our shapes use editing to allow for interactions inside of the shape. For example, a text shape behaves like a text graphic until the user begins editing it—and only then can the user use their keyboard to edit the text. Note that a shape can be interactive regardless of whether it's the editor's editing shape—the "editing" mechanic is just a way of managing a common pattern in canvas appliations.

In this example we'll create a shape that renders an emoji and allows the user to change the emoji when the shape is in the editing state.
Most of the relevant code for this is in the EditableShapeUtil.tsx file. If you want a more in-depth explanation of the shape util, check out the custom shape example.
