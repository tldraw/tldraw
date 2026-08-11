---
title: Drawn comment reactions
component: ./CommentDrawingReactionsExample.tsx
priority: 8
keywords: [comments, commenting, reactions, emoji, custom, drawing, collaboration]
---

Replace the emoji reaction picker with one you draw in.

---

A reaction's token is a free-form string — short and bounded, but the commenting layer never assumes it's an emoji glyph. So a custom reaction can be anything, as long as the token names the content rather than contains it: store the content in a custom synced record, and react with the record's id.

This example implements that in `drawing-reactions.tsx`. A `reaction-drawing` record type holds each distinct drawing's image, content-addressed so its id is a short hash. The palette is a small locked-down tldraw canvas with a pen and an eraser; it saves what you drew as a record and emits its id as the token. The renderer resolves a token back through the store and draws the image, letting anything else fall through — so drawn reactions and plain emoji coexist on the same comment.

Post a comment, then open its reaction picker and draw something.
