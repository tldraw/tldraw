---
title: Shape comment precision
component: ./CommentShapePrecisionExample.tsx
priority: 5
keywords: [comments, commenting, precise, imprecise, shape, anchor, alt, collaboration]
---

Pin a comment to the exact spot you clicked on a shape, or to the shape as a whole.

---

A comment on a shape anchors either precisely, at the clicked spot, or imprecisely, addressing the shape as a whole with its pin at `impreciseShapeAnchor`. Both track the shape as it moves and resizes.

`shouldBePrecise` makes the call, and receives the target shape's id, the release point, and whether Alt was held. Use the buttons to switch modes, then comment on the rectangle and the note to feel the difference.
