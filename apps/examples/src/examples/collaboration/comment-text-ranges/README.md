---
title: Comment on a text range
component: ./CommentTextRangesExample.tsx
priority: 6
keywords:
  [comments, commenting, text range, rich text, toolbar, selection, highlight, collaboration]
---

Comment on a selected range of text from the rich text toolbar.

---

Comment threads can anchor to a character range inside a shape's text with a `text-range` anchor. The anchor stores the shape's rich text and the selection's plaintext offsets as an immutable source snapshot. This example wires that anchor kind up end to end: double-click the text shape to edit it, select a few words, and press the comment button that appears in the rich text toolbar. The composer opens anchored to the selection, and the commented characters are highlighted on the canvas.

Three pieces make it work:

- **The toolbar button.** A custom `RichTextToolbar` component renders the default toolbar content plus a comment button (disabled while the selection is collapsed). Pressing it reads the tiptap selection, converts the ProseMirror positions to plaintext offsets, and calls `createTextRangeAnchor` with the current rich text. It sets `pendingComment` with that anchor — the same pending-comment flow the comment tool uses, so posting from the composer creates the thread and comment records normally.
- **Resolving the immutable anchor.** `resolveTextRangeAnchor` compares the source snapshot with the shape's current rich text and derives the range to display. It never rewrites the thread. Every client therefore gets the same result without coordinating anchor updates, and undo can recover a temporarily collapsed range because the source snapshot was not destroyed.
- **The highlight overlay.** `TextRangeHighlights` draws the resolved range for each text-range thread (and the pending draft). It finds the shape's rendered `.tl-rich-text` element, maps the resolved plaintext offsets to DOM positions with a `Range`, and re-measures whenever the camera or shape moves. Clicking a committed highlight opens its thread.

This prototype deliberately uses a simple plaintext diff. A production implementation should resolve structural rich-text positions through multiple edits, but that mapping can improve independently of the immutable anchor model.

`CanvasComments` already pins text-range threads to their shape's corner, so the pins, popovers, and composer all come from the stock overlay — the example only adds the button, the resolver, and the highlights.
