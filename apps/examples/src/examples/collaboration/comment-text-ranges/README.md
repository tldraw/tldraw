---
title: Comment on a text range
component: ./CommentTextRangesExample.tsx
priority: 5
keywords:
  [comments, commenting, text range, rich text, toolbar, selection, highlight, collaboration]
---

Comment on a selected range of text from the rich text toolbar.

---

Comment threads can anchor to a character range inside a shape's text with a `text-range` anchor: `{ type: 'text-range', shapeId, from, to }`, where `from`/`to` are plaintext character offsets. This example wires that anchor kind up end to end: double-click the text shape to edit it, select a few words, and press the comment button that appears in the rich text toolbar. The composer opens anchored to the selection, and the commented characters are highlighted on the canvas.

Two pieces make it work:

- **The toolbar button.** A custom `RichTextToolbar` component renders the default toolbar content plus a comment button (disabled while the selection is collapsed). Pressing it reads the tiptap selection, converts the ProseMirror positions to plaintext offsets, and sets `pendingComment` with a `text-range` anchor — the same pending-comment flow the comment tool uses, so posting from the composer creates the thread and comment records normally.
- **The highlight overlay.** `TextRangeHighlights` draws a highlight over each text-range thread's characters (and the pending draft's). It finds the shape's rendered `.tl-rich-text` element, maps the plaintext offsets to DOM positions with a `Range`, and re-measures whenever the camera or shape moves, so the highlight stays glued to the text. Clicking a committed highlight opens its thread.

`CanvasComments` already pins text-range threads to their shape's corner, so the pins, popovers, and composer all come from the stock overlay — the example only adds the button and the highlights.

One caveat to note: plaintext offsets don't re-track when the text is edited later, so a production implementation would keep anchors in sync with a tiptap mark or by mapping positions through document changes.
