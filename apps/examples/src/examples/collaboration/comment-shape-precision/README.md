---
title: Shape comment precision
component: ./CommentShapePrecisionExample.tsx
priority: 5
keywords: [comments, commenting, precise, imprecise, shape, anchor, alt, collaboration]
---

Choose whether commenting on a shape pins to the exact clicked point, to the shape as a whole, or lets Alt decide.

---

When a comment lands on a shape, its anchor is either **precise** — pinned to the exact clicked spot, as a normalized (0–1) offset within the shape — or **imprecise** — pinned to the shape as a whole, with the pin rendered at a spot your app chooses (`impreciseShapeAnchor`, top-right by default). Either way the anchor tracks the shape as it moves and resizes.

`preciseShapeAnchors` on `CommentTool.configure` picks which of those a placement produces:

- **`'always'`** (the default) — every shape comment is precise. Commenting feels like pointing at an exact spot, whether or not a shape is under the cursor.
- **`'never'`** — every shape comment is imprecise. Comments address the shape itself, and your app owns where the pin sits.
- **`'alt'`** — both: imprecise normally, precise while Alt is held during placement.

```tsx
<Tldraw tools={[CommentTool.configure({ preciseShapeAnchors: 'never' })]} />
```

The setting applies wherever a shape anchor is created — placing with the comment tool, and dropping a dragged pin onto a shape. It only governs new placements: anchors already stored keep rendering the way they were made.

Use the buttons to switch modes, then place comments on the rectangle (press `c` or pick the comment tool) to feel the difference.
