---
title: Shape comment precision
component: ./CommentShapePrecisionExample.tsx
priority: 5
keywords: [comments, commenting, precise, imprecise, shape, anchor, alt, collaboration]
---

Decide whether commenting on a shape pins to the exact clicked point or to the shape as a whole — per placement, from the shape, or as a fixed rule.

---

When a comment lands on a shape, its anchor is either **precise** — pinned to the exact clicked spot, as a normalized (0–1) offset within the shape — or **imprecise** — pinned to the shape as a whole, with the pin rendered at a spot your app chooses (`impreciseShapeAnchor`, top-right by default). Either way the anchor tracks the shape as it moves and resizes.

`shouldBePrecise` on `CommentTool.configure` makes that call. It receives the editor and the gesture's context — the target shape, the release point, and whether Alt was held — so it can be:

- **a constant** — `() => true` (always precise, the default) or `() => false` (shape-only)
- **an Alt-gated choice** — `(editor, { altKey }) => altKey`: imprecise normally, precise while Alt is held
- **a decision from the shape** — e.g. precise on notes, shape-level everywhere else:

```tsx
<Tldraw
	tools={[
		CommentTool.configure({
			shouldBePrecise: (editor, { shapeId }) => editor.getShape(shapeId)?.type === 'note',
		}),
	]}
/>
```

The predicate runs wherever a shape anchor is created — placing with the comment tool, and dropping a dragged pin onto a shape. It only governs new placements: anchors already stored keep rendering the way they were made.

Use the buttons to switch modes, then place comments on the rectangle and the note (press `c` or pick the comment tool) to feel the difference.
