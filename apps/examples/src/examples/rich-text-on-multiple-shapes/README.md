---
title: Format rich text on multiple shapes
component: ./RichTextFormatOnMultipleShapesExample.tsx
category: ui
priority: 0.5
keywords:
  [
    rich text,
    formatting,
    batch edit,
    multiple shapes,
    style panel,
    bold,
    marks,
    programmatic formatting,
    tlrichtext,
    document traversal,
  ]
---

Add a toggle button to the style panel that allows you to make all text bold (or remove bold) from multiple selected shapes at once.

---

This example demonstrates how to work with rich text formatting programmatically so that you can apply formatting changes to multiple shapes simultaneously.

Rich text in tldraw uses TipTap's document structure. Text nodes can have `marks` array that contains formatting information like `{ type: 'bold' }`. The example includes helper functions to:

- `makeAllTextBold()`: Recursively traverses the rich text document and adds bold marks to all text nodes
- `removeBoldFromAllText()`: Recursively removes bold marks from all text nodes
- `isAllTextBold()`: Checks if all text nodes in a rich text document have bold marks
