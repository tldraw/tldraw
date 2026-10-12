---
title: Contextual toolbar
component: ./ContextualToolbarExample.tsx
priority: 2
keywords:
  [
    contextual toolbar,
    infrontofthecanvas,
    selection,
    ui overlay,
    custom ui,
    toolbar,
    selected shapes,
  ]
---

Show a toolbar above the selected shapes using the `TldrawUiContextualToolbar` primitive.

---

The toolbar is rendered in the `InFrontOfTheCanvas` slot, so it appears above the canvas but below the rest of the UI. It positions itself using the bounds returned from `getSelectionBounds`, and reads the shared size style of the selection with `editor.getSharedStyles()`.

Select shapes of different types and change their size from the toolbar; this works just like changing the size from the style panel on the right.
