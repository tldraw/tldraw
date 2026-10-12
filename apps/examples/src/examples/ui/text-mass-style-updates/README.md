---
title: Text mass style updates
component: ./TextMassStyleUpdates.tsx
priority: 2
keywords: [text, contextual, mass, style, bold, italic, highlight, styles]
---

Toggle bold, italic, or highlight on all the text in the selected shapes, including text nested in frames.

---

Rich text in tldraw is a TipTap (ProseMirror) JSON document. This example parses it with ProseMirror's `Node.fromJSON` (using a schema built from `tipTapDefaultExtensions`), adds or removes a mark on every text node, and writes the result back with `editor.updateShape`. Container shapes such as frames and groups are handled by recursing into `editor.getSortedChildIdsForParent`.

The buttons live in a custom `StylePanel` that wraps `DefaultStylePanel`. They only appear when the selection (expanded with `editor.getShapeAndDescendantIds`) contains at least one shape with rich text, and each shows as active when every text node already carries its mark. Try selecting a frame full of text and pressing "Bold all".

For a lighter version that walks the JSON directly, see the [format rich text on multiple shapes](https://tldraw.dev/examples/rich-text-on-multiple-shapes) example.
