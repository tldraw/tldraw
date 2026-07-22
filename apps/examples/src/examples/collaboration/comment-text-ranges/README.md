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
- **Keeping anchors on their words.** Character offsets go stale the moment the text changes: type a word at the top of the shape and every range below it now points a few characters too early. `trackTextRangeAnchors` watches shape changes for a change to the rich text, diffs the old and new plaintext into a single replaced span, and maps each affected anchor's offsets across it — the same position mapping ProseMirror does for its own marks. Text typed inside a commented range joins the range and text typed against either edge stays outside it. An edit that reaches past a boundary pulls it inwards, so the range keeps only what survived — down to nothing if the edit swallowed it whole, in which case the thread stays and keeps its pin on the shape with no characters left to highlight. Boundaries only ever collapse inwards, never outwards, so no sequence of edits can creep a comment out over a passage nobody commented on.

Because the remapping works from the shape record rather than from tiptap, it covers every kind of edit — typing, undo and redo, programmatic `updateShapes` calls, and remote collaborators' changes arriving over sync. Each client remaps its own anchors from the same text change, so they stay in agreement without any extra traffic on the wire.

`CanvasComments` already pins text-range threads to their shape's corner, so the pins, popovers, and composer all come from the stock overlay — the example only adds the button, the highlights, and the tracking.
