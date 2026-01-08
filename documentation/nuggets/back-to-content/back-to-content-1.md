---
title: Back to content
created_at: 01/07/2025
updated_at: 01/07/2025
keywords:
  - navigation
  - culling
  - viewport
  - UX
---

# Back to content

Infinite canvases have a problem: the infinite part. You can pan anywhere you want, which means you can pan away from everything you've drawn. Zoom out to see your whole document, pan somewhere else, zoom back in, and... nothing. The canvas stretches forever and your work is somewhere out there in the void.

We needed a way to bring users back when they get lost, but we didn't want a button visible all the time. It's only useful when you've actually lost your content. The question became: how do we know when someone can't see any of their shapes?

## Reusing the visibility system

It turns out we already had this information. For rendering performance, tldraw tracks which shapes are outside the viewport via `getNotVisibleShapes()`. The check is straightforward: compare each shape's bounds against the viewport bounds. Shapes that don't intersect are marked as not visible.

```tsx
// Shape is visible if it overlaps the viewport
if (
	pageBounds !== undefined &&
	pageBounds.maxX >= viewMinX &&
	pageBounds.minX <= viewMaxX &&
	pageBounds.maxY >= viewMinY &&
	pageBounds.minY <= viewMaxY
) {
	continue // visible
}
```

The "Back to content" button appears when all shapes on the page are not visible:

```tsx
const shapeIds = editor.getCurrentPageShapeIds()
let showBackToContentNow = false
if (shapeIds.size) {
	showBackToContentNow = shapeIds.size === editor.getNotVisibleShapes().size
}
```

If the total number of shapes equals the number of not-visible shapes, everything is offscreen. Time to show the button.

## Why immediate reactions matter

The visibility check runs in a `useQuickReactor` instead of the more common `useReactor`. The difference: quick reactors execute immediately when their dependencies change, while regular reactors batch updates to animation frames.

For most UI, batching is fine. But for "am I lost?" detection, a one-frame delay would feel wrong. You pan away from your content and... nothing happens. Then a frame later the button appears. It's subtle but it feels broken.

## When the button appears

The button shows up in the top-left corner with an arrow icon and "Back to content" label. Click it and the camera smoothly animates back to your shapes:

```tsx
const bounds = editor.getSelectionPageBounds() ?? editor.getCurrentPageBounds()
if (!bounds) return
editor.zoomToBounds(bounds, {
	targetZoom: Math.min(1, editor.getZoomLevel()),
	animation: { duration: 220 },
})
```

If you have shapes selected, it zooms to the selection. Otherwise, it zooms to fit all content on the page. The zoom caps at 100% so you don't end up with a jarring close-up.

## The flicker prevention trick

There's one subtle detail in the implementation. The component tracks visibility in both React state and a ref:

```tsx
const [showBackToContent, setShowBackToContent] = useState(false)
const rIsShowing = useRef(false)

// Inside the reactor...
if (showBackToContentPrev !== showBackToContentNow) {
	setShowBackToContent(showBackToContentNow)
	rIsShowing.current = showBackToContentNow
}
```

The ref provides a synchronous check of the current state without triggering re-renders. The state only updates when visibility actually changes. During rapid panning, the reactor fires constantly as shapes enter and exit the viewport. Without this check, each fire would trigger a render, potentially causing flicker. The ref lets us compare to the previous value and only render when there's a real change.

## The unexpected reuse

We built the visibility tracking system to make rendering faster. Every frame, we check "is this shape in the viewport?" so we can skip drawing shapes that wouldn't be visible anyway. The performance win was significant for documents with many shapes.

It wasn't until later that we realized: the same calculation that tells us "should I render this shape?" also tells us "can the user see any of their work?" The Back to content button doesn't need its own visibility logic. It just asks the visibility system a slightly different question: not "which shapes are invisible?" but "are all shapes invisible?"

The code lives in `packages/tldraw/src/lib/ui/components/HelperButtons/BackToContent.tsx`.
