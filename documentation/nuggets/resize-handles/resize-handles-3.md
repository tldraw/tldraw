---
title: Resize handles on rotated shapes
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - resize
  - handles
  - cursor
status: published
date: 12/21/2025
order: 2
---

# Cursor offset and flip handling

When we built resize handles for rotated shapes, we ran into a subtle problem: users don't click exactly at the center of a handle. They click somewhere inside the target area, but the resize calculations need a precise handle point. If we used the click position directly, the handle would appear to jump under the cursor.

Here's how we keep handles glued to the cursor during drag, and how we update cursor direction as shapes flip.

## The offset problem

Resize handles have two different sizes: the visual handle (a small square) and the target area (a larger invisible hitbox). The target makes handles easier to grab, but it creates a problem.

When you click inside the target area, your cursor might be 10 pixels away from the handle's mathematical center. If we start the drag using your click position, the handle appears to jump to align with the cursor. It's jarring.

We fix this by calculating an offset when the drag starts:

```typescript
const dragHandlePoint = Vec.RotWith(
	selectionBounds.getHandlePoint(this.info.handle!),
	selectionBounds.point,
	selectionRotation
)

const cursorHandleOffset = Vec.Sub(originPagePoint, dragHandlePoint)
```

The `dragHandlePoint` is where the handle actually is. The `originPagePoint` is where you clicked. The difference is the offset—how far your cursor is from the handle center.

During the drag, we adjust both the current and origin points:

```typescript
const currentPagePoint = this.editor.inputs.getCurrentPagePoint().clone().sub(cursorHandleOffset)

const originPagePoint = this.editor.inputs.getOriginPagePoint().clone().sub(cursorHandleOffset)
```

Both positions get the same offset subtracted. This makes the math work as if you clicked exactly at the handle center, which keeps the handle visually locked to your cursor.

## Target area sizing

Handle targets are larger on touch devices. We detect coarse pointers (fingers) and multiply the target size:

```typescript
const zoom = editor.getEfficientZoomLevel()
const targetSize = (6 / zoom) * (isCoarsePointer ? 1.75 : 1)
```

Small shapes get smaller targets—if the target area is larger than the shape, handles overlap and become confusing. We detect small shapes and reduce the target size:

```typescript
const targetSizeX = (isSmallX ? targetSize / 2 : targetSize) * 0.75
const targetSizeY = (isSmallY ? targetSize / 2 : targetSize) * 0.75
```

Corner handles extend 1.5× the target size beyond the corner in each direction (2× for small shapes), making them easy to grab even at tight corners.

## Cursor updates during flip

As you resize a shape past its opposite edge, it flips. When `scale.x < 0`, the shape is horizontally flipped. When `scale.y < 0`, it's vertically flipped. When the shape flips, the cursor direction needs to update—a "northwest-southeast" cursor should become "northeast-southwest" when the shape mirrors.

We use an XOR condition to detect when the cursor should swap:

```typescript
case 'top_left':
case 'bottom_right': {
  nextCursor.type = 'nwse-resize'
  if (isFlippedX !== isFlippedY) {
    nextCursor.type = 'nesw-resize'
  }
  break
}
case 'top_right':
case 'bottom_left': {
  nextCursor.type = 'nesw-resize'
  if (isFlippedX !== isFlippedY) {
    nextCursor.type = 'nwse-resize'
  }
  break
}
```

The XOR condition `isFlippedX !== isFlippedY` is true when exactly one axis is flipped. If both axes are flipped (or neither), the diagonal cursor stays the same. If one axis is flipped, the diagonal swaps direction.

This happens during every drag frame, so the cursor smoothly changes as the shape crosses the flip threshold.

## Cursor rotation

Browsers only provide 8 fixed resize cursors (`nwse-resize`, `ew-resize`, etc.) and they can't be rotated with CSS. We need cursors that match the rotation of the shape, so we generate custom cursors using SVG embedded in a data URI.

Each cursor is an SVG with a drop shadow. The shadow always points "down" in screen space, regardless of rotation:

```typescript
const a = (-tr - r) * (PI / 180) // Convert to radians
const s = Math.sin(a)
const c = Math.cos(a)
const dx = 1 * c - 1 * s // Rotated shadow offset
const dy = 1 * s + 1 * c
```

The cursor itself rotates to match the shape's rotation, giving the illusion that the cursor is aligned with the resize axis even on heavily rotated shapes.

For multi-selection, we don't rotate cursors. Selected shapes might have different rotations, so showing a cursor that matches none of them would be confusing. An unrotated cursor is clearer.

## Code locations

Handle offset calculation: `/packages/tldraw/src/lib/tools/SelectTool/childStates/Resizing.ts:484-490`

Cursor update logic: `/packages/tldraw/src/lib/tools/SelectTool/childStates/Resizing.ts:432-467`

Target area sizing: `/packages/tldraw/src/lib/canvas/TldrawSelectionForeground.tsx:66-86`

Custom cursor generation: `/packages/editor/src/lib/hooks/useCursor.ts:12-34`
