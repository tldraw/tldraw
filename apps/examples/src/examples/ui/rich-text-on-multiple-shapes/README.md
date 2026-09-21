---
title: Format rich text on multiple shapes
component: ./RichTextFormatOnMultipleShapesExample.tsx
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

Add a style panel button that bolds (or unbolds) all the text in every selected shape at once.

---

Rich text in tldraw is a TipTap (ProseMirror) JSON document stored in `shape.props.richText`. Each text node can carry a `marks` array, and bold is represented as `{ type: 'bold' }`. This example walks that document with three small helpers, `makeAllTextBold`, `removeBoldFromAllText`, and `isAllTextBold`, and writes the result back with `editor.updateShapes`.

The button lives in a custom `StylePanel` that wraps `DefaultStylePanel`. It reads the selection with `useValue`, so it enables itself whenever any selected shape has rich text and shows as active when every text node is already bold. Try selecting a mix of text, geo, and note shapes and toggling the button.

For the same idea built on ProseMirror's `Node` API (bold, italic, and highlight, including shapes nested inside frames and groups), see the [text mass style updates](https://tldraw.dev/examples/text-mass-style-updates) example.
