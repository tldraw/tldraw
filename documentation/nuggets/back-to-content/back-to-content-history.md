---
title: Back to content - code history
created_at: 2026-01-12
updated_at: 2026-01-12
keywords:
  - history
  - navigation
  - culling
  - viewport
  - helper buttons
  - UX
status: reference
---

# Back to content - code history

This document traces the evolution of tldraw's "Back to content" button implementation through its git history.

## Timeline

### 2021-11-03 - Initial BackToContent component

Commit: e2369003c ([improvement] UI (#215))

**What changed:**

- First implementation of the `BackToContent` component
- Used a simple selector pattern to detect empty canvas state
- Relied on `appState.isEmptyCanvas` flag

**Why this mattered:**

This was the first solution to the "lost user" problem on infinite canvas. The implementation was straightforward but relied on a manually-maintained state flag.

**Code example:**

```tsx
const isEmptyCanvasSelector = (s: Data) =>
  Object.keys(s.document.pages[s.appState.currentPageId].shapes).length > 0 &&
  s.appState.isEmptyCanvas

export const BackToContent = React.memo(() => {
  const { tlstate, useSelector } = useTLDrawContext()
  const isEmptyCanvas = useSelector(isEmptyCanvasSelector)

  if (!isEmptyCanvas) return null

  return (
    <BackToContentContainer>
      <RowButton onSelect={tlstate.zoomToContent}>Back to content</RowButton>
    </BackToContentContainer>
  )
})
```

---

### 2023-05-11 - Rename backToContent to zoomToContent

Commit: 3437ca89d ([feature] ui events (#1326))

**What changed:**

- Renamed `backToContent` method to `zoomToContent` in the editor
- Added comprehensive event tracking for UI actions
- Established the `onEvent` prop pattern for tracking user interactions

**Why this mattered:**

The rename reflected the actual behavior more accurately - the button zooms to show content, it doesn't navigate "back" in any history sense. This also established the analytics foundation for understanding how users interact with the feature.

---

### 2024-02-15 - Composable custom UI architecture

Commit: ac0259a6a (Composable custom UI (#2796))

**What changed:**

- Moved `BackToContent.tsx` into new `HelperButtons/` folder
- Created the helper buttons system alongside other context-sensitive UI elements
- Introduced `DefaultHelperButtons` and `DefaultHelperButtonsContent` components
- Replaced custom `Button` component with `TldrawUiMenuItem`

**Why this mattered:**

This was a major architectural change that made the entire UI composable. The BackToContent button became part of a family of "helper buttons" - context-sensitive UI that appears when needed:

- `ExitPenMode` - shown when in pen mode
- `BackToContent` - shown when all shapes are offscreen
- `StopFollowing` - shown when following another user's viewport

Users could now customize or replace any of these buttons through the components prop.

**Code example:**

```tsx
export function DefaultHelperButtonsContent() {
  return (
    <>
      <ExitPenMode />
      <BackToContent />
      <StopFollowing />
    </>
  )
}
```

---

### 2024-04-05 - Display none for culled shapes

Commit: f1e0af763 (Display none for culled shapes (#3291))

**What changed:**

- Introduced `display: none` optimization for culled shapes
- Added skeleton placeholders for culled shapes
- Improved rendering performance significantly

**Why this mattered:**

This laid the groundwork for the visibility tracking system that BackToContent would later use. By properly tracking which shapes were culled (hidden because they're offscreen), the system could answer "are all shapes invisible?" more efficiently.

---

### 2024-04-08 - Improve setting of display none

Commit: 947f7b1d7 ([culling] Improve setting of display none (#3376))

**What changed:**

- Used reactor pattern for culling state updates
- Reduced unnecessary DOM operations

**Why this mattered:**

Made the culling system more reactive and efficient, which improved the reliability of the visibility tracking that BackToContent depends on.

---

### 2024-04-10 - Incremental culled shapes calculation

Commit: 987b1ac0b (Perf: Incremental culled shapes calculation (#3411))

**What changed:**

- Created the `notVisibleShapes` derivation in its own file
- Implemented incremental computation instead of recalculating from scratch
- Introduced `getCulledShapes()` method on Editor
- Separated "not visible" (outside viewport) from "culled" (not rendered)

**Why this mattered:**

This was a fundamental performance improvement and architectural clarification. The new `notVisibleShapes` derivation efficiently tracks which shapes are outside the viewport bounds by incrementally updating based on shape changes, rather than recomputing for every frame.

The separation between "not visible" and "culled" became important later - selected shapes are not culled (they keep rendering) but they can be not visible (outside viewport).

**Code example (initial implementation):**

```typescript
function isShapeNotVisible(editor: Editor, id: TLShapeId, viewportPageBounds: Box): boolean {
  const maskedPageBounds = editor.getShapeMaskedPageBounds(id)
  // if the shape is fully outside of its parent's clipping bounds...
  if (maskedPageBounds === undefined) return true
  // if the shape is fully outside of the viewport page bounds...
  return !viewportPageBounds.includes(maskedPageBounds)
}
```

---

### 2024-04-15 - RBush spatial indexing

Commit: 45dffd1af (RBush again? (#3439))

**What changed:**

- Added RBush spatial indexing for efficient spatial queries
- Used for culling, brushing, erasing, and hover detection
- Made panning much faster as culling no longer requires full recalculation

**Why this mattered:**

RBush provides O(log n) spatial queries instead of O(n) iteration. This dramatically improved performance when panning through documents with many shapes - exactly the scenario where users are most likely to get lost and need the Back to content button.

---

### 2024-04-17 - Fix culling for multiplayer

Commit: 0b44a8b47 (Fix culling (#3504))

**What changed:**

- Fixed culling for shapes dragged into viewport by other users
- Properly handled arrows bound to dragged shapes
- Fixed shapes within groups and frames

**Why this mattered:**

In collaborative editing, shapes can appear in your viewport without you doing anything. This fix ensured the visibility tracking remained accurate in multiplayer scenarios.

---

### 2024-04-19 - Improve back to content with reactive updates

Commit: f6a2e352d (Improve back to content (#3532))

**What changed:**

- Replaced interval-based polling with `useQuickReactor`
- Changed from filtering `renderingShapes` to comparing `getCulledShapes().size` with page shape count
- Added ref-based anti-flicker pattern

**Why this mattered:**

The previous implementation used a 1-second interval to check if shapes were visible - a crude approach that wasted resources and had noticeable latency. The new reactive approach updates immediately when the viewport changes.

**Before:**

```tsx
useEffect(() => {
  const interval = setInterval(() => {
    const renderingShapes = editor.getRenderingShapes()
    const renderingBounds = editor.getRenderingBounds()
    const visibleShapes = renderingShapes.filter((s) => {
      const maskedPageBounds = editor.getShapeMaskedPageBounds(s.id)
      return maskedPageBounds && renderingBounds.includes(maskedPageBounds)
    })
    const showBackToContentNow =
      visibleShapes.length === 0 && editor.getCurrentPageShapes().length > 0
    // ...
  }, 1000)
  return () => clearInterval(interval)
}, [editor])
```

**After:**

```tsx
useQuickReactor(
  'toggle showback to content',
  () => {
    const showBackToContentPrev = rIsShowing.current
    const shapeIds = editor.getCurrentPageShapeIds()
    let showBackToContentNow = false
    if (shapeIds.size) {
      showBackToContentNow = shapeIds.size === editor.getCulledShapes().size
    }
    if (showBackToContentPrev !== showBackToContentNow) {
      setShowBackToContent(showBackToContentNow)
      rIsShowing.current = showBackToContentNow
    }
  },
  [editor]
)
```

---

### 2024-05-04 - Camera options API

Commit: fabba66c0 (Camera options (#3282))

**What changed:**

- Comprehensive camera options API
- Zoom steps, pan speed, zoom speed configuration
- Camera constraints system

**Why this mattered:**

While not directly about BackToContent, this established the camera APIs that the back-to-content action uses. The `zoomToBounds` method became more configurable and predictable.

---

### 2025-05-27 - Minor perf tweak to notVisibleShapes

Commit: 2906fe178 (Minor perf tweak to notVisibleShapes (#6086))

**What changed:**

- Removed unnecessary check for masked page bounds
- Simplified the hot path for getting hovered shapes

**Why this mattered:**

The notVisibleShapes derivation runs frequently (on every camera change), so even small optimizations compound. This made panning and zooming smoother.

---

### 2025-06-08 - Tidy up notVisibleShapes

Commit: 2465f32ac (Tidy up notVisibleShapes (#6209))

**What changed:**

- Internal code cleanup around `Editor.notVisibleShapes`
- API consistency improvements

**Why this mattered:**

Preparatory cleanup for the derivation, making it easier to understand and maintain.

---

### 2025-12-23 - Optimize notVisibleShapes with inlined bounds checks

Commit: 2293c7f49 (perf: optimize notVisibleShapes derivation with inlined bounds checks (#7429))

**What changed:**

- Inlined bounds collision check instead of calling `Box.Includes`
- Deferred expensive `getShape` and `canCull` calls until after bounds check
- Early-continue pattern for visible shapes

**Why this mattered:**

Most shapes are typically visible during normal use. By checking bounds first and only doing expensive lookups for shapes that fail the bounds check, performance improved significantly for documents with many shapes.

**Code example:**

```typescript
// Extract viewport bounds once to avoid repeated property access
const viewMinX = viewportPageBounds.minX
const viewMinY = viewportPageBounds.minY
const viewMaxX = viewportPageBounds.maxX
const viewMaxY = viewportPageBounds.maxY

for (const id of shapeIds) {
  const pageBounds = editor.getShapePageBounds(id)

  // Hybrid check: if bounds exist and shape overlaps viewport, it's visible.
  if (
    pageBounds !== undefined &&
    pageBounds.maxX >= viewMinX &&
    pageBounds.minX <= viewMaxX &&
    pageBounds.maxY >= viewMinY &&
    pageBounds.minY <= viewMaxY
  ) {
    continue
  }
  // Shape is outside viewport - now do expensive checks...
}
```

---

### 2026-01-07 - Fix back to content for selected shapes

Commit: a24192504 (fix(tldraw): show back to content button when selected shapes are off-screen (#7649))

**What changed:**

- Changed from `getCulledShapes()` to `getNotVisibleShapes()` for visibility check
- Added unit tests for the BackToContent component

**Why this mattered:**

This fixed a subtle but important bug. Selected shapes are excluded from culling (they keep rendering even offscreen so selection handles stay visible). But this meant if you selected shapes, panned away, the Back to content button wouldn't appear - because `getCulledShapes()` didn't include your selected shapes.

The fix uses `getNotVisibleShapes()` which tracks all shapes outside the viewport, regardless of selection state.

**Code change:**

```diff
- showBackToContentNow = shapeIds.size === editor.getCulledShapes().size
+ showBackToContentNow = shapeIds.size === editor.getNotVisibleShapes().size
```

---

## Key architectural decisions

### Reactive derivations over polling

The most significant architectural decision was moving from interval-based polling (checking every second) to reactive derivations. This meant:

- Instant updates when the camera moves
- No wasted computation when nothing changes
- Natural integration with tldraw's reactive state system

### Reusing visibility tracking

The `notVisibleShapes` derivation was created for rendering performance (to skip rendering offscreen shapes), but it turned out to be exactly the information needed to answer the UX question "has the user lost their content?" This pattern of building computed derivations that answer multiple questions is a key architectural insight.

### Separation of culled vs not visible

The distinction between "culled" (not rendered) and "not visible" (outside viewport) became crucial:

- Culled shapes: outside viewport AND not selected
- Not visible shapes: outside viewport, regardless of selection

This separation allowed the rendering optimization (don't render culled shapes) to work independently from the UX feature (show help when all shapes are offscreen).

---

## Problems solved along the way

| Date       | Problem                                                    | Solution                                            |
| ---------- | ---------------------------------------------------------- | --------------------------------------------------- |
| 2024-04-19 | 1-second delay before button appeared                      | Switched to useQuickReactor for immediate updates   |
| 2024-04-17 | Shapes dragged by other users didn't update culling        | Fixed incremental update to handle multiplayer      |
| 2024-04-15 | Slow panning with many shapes                              | Added RBush spatial indexing                        |
| 2025-12-23 | Slow bounds checking on hot path                           | Inlined bounds checks, deferred expensive calls     |
| 2026-01-07 | Button didn't appear when selected shapes were offscreen   | Use getNotVisibleShapes instead of getCulledShapes  |

---

## Source files

- Back to content component: `packages/tldraw/src/lib/ui/components/HelperButtons/BackToContent.tsx`
- Back to content action: `packages/tldraw/src/lib/ui/context/actions.tsx`
- Visibility derivation: `packages/editor/src/lib/editor/derivations/notVisibleShapes.ts`
- Quick reactor hook: `packages/state-react/src/lib/useQuickReactor.ts`
- Helper buttons container: `packages/tldraw/src/lib/ui/components/HelperButtons/DefaultHelperButtonsContent.tsx`
