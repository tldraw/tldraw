---
title: Note resizing
component: ./ResizeNoteExample.tsx
priority: 5
keywords:
  [
    note shape,
    resize,
    sticky note,
    resizemode,
    scale,
    configure,
    shapeutil configuration,
    note scaling,
  ]
---

Let users resize sticky notes with `NoteShapeUtil`'s `resizeMode` option.

---

Notes have a fixed size by default and can't be resized. `NoteShapeUtil.configure({ resizeMode: 'scale' })` makes them scale as a whole when a resize handle is dragged: the note, its text, and its padding all grow together, so the note keeps its proportions rather than reflowing.

Create a note (N) and drag a corner handle to try it. `resizeMode: 'none'` is the default behavior.
