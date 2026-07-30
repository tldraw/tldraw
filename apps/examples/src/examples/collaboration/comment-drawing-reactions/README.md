---
title: Drawn comment reactions
component: ./CommentDrawingReactionsExample.tsx
priority: 8
keywords: [comments, commenting, reactions, emoji, custom, drawing, collaboration]
---

Replace the emoji reaction picker with one you draw in.

---

A reaction's token is a free-form string. The commenting layer stores it, syncs it, and hands it back to a renderer — it never assumes the string is an emoji glyph. So a custom reaction system is two pieces that agree with each other: a palette that produces tokens, and a renderer that draws them.

This example implements both in `drawing-reactions.tsx`. The palette is a small locked-down tldraw canvas with a pen and an eraser, and it emits what you drew as a `data:` image URL. The renderer draws such a token as an `<img>` and lets anything else fall through, so drawn reactions and plain emoji coexist on the same comment.

Post a comment, then open its reaction picker and draw something.
