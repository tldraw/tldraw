---
title: Search text on the canvas
component: ./TextSearchExample.tsx
priority: 2
keywords:
  [
    search,
    text search,
    find text,
    keyboard shortcut,
    helpers,
    helperButtons,
    filter shapes,
    overrides,
    actions,
    gettext,
  ]
---

Search the text of every shape on the current page and zoom to a result.

---

Each shape util exposes its text through `getText(shape)`, so the search filters `editor.getCurrentPageShapes()` by that value. Results are listed in the `HelperButtons` UI slot, and clicking one selects the shape and calls `zoomToSelection` to animate the camera to it. A UI action override binds Cmd+F / Ctrl+F to open the panel.

Add some text or shapes with labels, press Cmd+F or Ctrl+F, and start typing. Press Escape to close.
