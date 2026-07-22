---
title: Comment on a text range
component: ./CommentTextRangesExample.tsx
priority: 6
keywords:
  [comments, commenting, text range, rich text, toolbar, selection, highlight, collaboration]
---

Comment on a selected range of text from the rich text toolbar.

---

Comment threads can anchor to a character range inside a shape's text with a `text-range` anchor: `{ type: 'text-range', shapeId, from, to }`, where `from`/`to` are plaintext character offsets. This example wires that anchor kind up end to end: double-click the text shape to edit it, select a few words, and press the comment button that appears in the rich text toolbar. The composer opens anchored to the selection, and the commented characters are highlighted on the canvas.

Three pieces make it work:

- **The toolbar button.** A custom `RichTextToolbar` component renders the default toolbar content plus a comment button (disabled while the selection is collapsed). Pressing it reads the tiptap selection, converts the ProseMirror positions to plaintext offsets, and sets `pendingComment` with a `text-range` anchor — the same pending-comment flow the comment tool uses, so posting from the composer creates the thread and comment records normally.
- **The highlight overlay.** `TextRangeHighlights` draws a highlight over each text-range thread's characters (and the pending draft's). It finds the shape's rendered `.tl-rich-text` element, maps the plaintext offsets to DOM positions with a `Range`, and re-measures whenever the camera or shape moves, so the highlight stays glued to the text. Clicking a committed highlight opens its thread.
- **Keeping anchors on their words.** Character offsets go stale the moment the text changes: type a word at the top of the shape and every range below it points a few characters too early. `trackTextRangeAnchors(editor)` watches shape changes for a change to the rich text and maps each affected anchor across it, returning a function that stops tracking. Text typed inside a range joins it and text typed against either edge stays outside it. An edit that reaches past a boundary pulls it inwards, so a range keeps only what survived — nothing at all if the edit swallowed it whole, leaving the thread with its pin but no highlight.

Tracking is opt-in: call it from `onMount` and return it for cleanup. Read its docs before wiring it into a synced app — anchor writes don't land on the undo stack by default, and remapping on every client at once has costs worth knowing about.

`CanvasComments` already pins text-range threads to their shape's corner, so the pins, popovers, and composer all come from the stock overlay — the example only adds the button, the highlights, and the tracking.
