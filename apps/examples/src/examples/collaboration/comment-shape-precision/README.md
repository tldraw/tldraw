---
title: Shape comment precision
component: ./CommentShapePrecisionExample.tsx
priority: 5
keywords:
  [comments, commenting, precise, imprecise, shape, anchor, alt, outline, stroke, collaboration]
---

Decide what commenting on a shape attaches to, and whether it pins to the exact clicked point or to the shape as a whole.

---

When a comment lands on a shape, its anchor is either **precise** — pinned to the exact clicked spot, as a normalized (0–1) offset within the shape — or **imprecise** — pinned to the shape as a whole, with the pin rendered at a spot your app chooses (`impreciseShapeAnchor`, top-right by default). Either way the anchor tracks the shape as it moves and resizes.

`shouldBePrecise` on `CommentTool.configure` makes that call. It receives the editor and the gesture's context — the target shape, the release point, and whether Alt was held — so it can be:

- **a constant** — `() => true` for always-precise, `() => false` for shape-only
- **the default** — `(editor, { altKey }) => altKey`: imprecise normally, precise while Alt is held
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

## What counts as being over a shape

Precision decides _where on a shape_ a comment lands. `shapeAnchorTargets` decides whether it lands on the shape at all:

- **`'area'`** (the default) — anywhere within the shape, its fill included.
- **`'outline'`** — only the shape's stroke. A click in the blank middle of a rectangle leaves the comment a free point on the page instead of attaching.

```tsx
<Tldraw tools={[CommentTool.configure({ shapeAnchorTargets: 'outline' })]} />
```

Under `'outline'`, shapes with no stroke to aim at — images, video, text, notes, bookmarks and embeds — still attach anywhere in their area, so a comment on a photo doesn't have to land on its border. Frames are not exempt, so a comment placed inside a frame isn't bound to the frame itself.

The setting also governs the highlight shown while you hover or drag, so the outline only lights up where a release would actually attach.

## Try it

The two rows of buttons switch the settings independently. Place comments (press `c` or pick the comment tool) on the rectangle and the note to feel the difference — in particular, click the blank middle of the rectangle under each targeting mode, then drag a placed pin around. Hold Alt while dragging a pin that's already on a shape to keep it on that shape and move it anywhere within the shape's box.
