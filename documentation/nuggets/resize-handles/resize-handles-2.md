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
order: 1
---

# Resize handles on rotated shapes

When you drag a resize handle on a shape, the calculation seems straightforward—measure how far the handle moved, calculate the new size. This breaks on rotated shapes.

The problem is that handle names describe shape-local position. The "right" handle is on the right side of the shape's coordinate system, not on the right side of your screen. Rotate a rectangle 90 degrees, and the shape's "right" handle appears at the top of your screen. If we measured screen-space drag distance, we'd try to adjust the shape's width along screen-horizontal, but the shape's width is along its local X axis—which now points up.

We need to transform the drag delta into the shape's coordinate system before calculating scale.

## Rotating vectors

Here's the core insight: we measure distances from the scale origin in page coordinates, then rotate them backwards by the shape's rotation to get shape-local coordinates.

```typescript
// Distance vectors in page space
const distanceFromScaleOriginNow = Vec.Sub(currentPagePoint, scaleOriginPage).rot(
	-selectionRotation
)

const distanceFromScaleOriginAtStart = Vec.Sub(originPagePoint, scaleOriginPage).rot(
	-selectionRotation
)

// Scale is the ratio in shape-local space
const scale = Vec.DivV(distanceFromScaleOriginNow, distanceFromScaleOriginAtStart)
```

The scale origin is the opposite handle from the one being dragged. When you drag the right handle, the left edge stays fixed. When you hold Alt, the center stays fixed instead—the shape scales from its midpoint.

```typescript
const scaleOriginPage = Vec.RotWith(
	altKey ? selectionBounds.center : selectionBounds.getHandlePoint(scaleOriginHandle),
	selectionBounds.point,
	selectionRotation
)
```

The `Vec.rot()` operation is a standard 2D rotation matrix:

```typescript
static Rot(A: VecLike, r = 0): Vec {
  const s = Math.sin(r)
  const c = Math.cos(r)
  return new Vec(A.x * c - A.y * s, A.x * s + A.y * c)
}
```

We rotate by the negative of the selection rotation because we're transforming from page space back to shape space—the inverse operation.

## Handling degenerate cases

When the drag handle moves exactly to the scale origin, the distance becomes zero and we'd divide by zero. We clamp these to 1 (no scale):

```typescript
if (!Number.isFinite(scale.x)) scale.x = 1
if (!Number.isFinite(scale.y)) scale.y = 1
```

Edge handles only scale along one axis. The "right" handle scales width but not height, so we lock the Y scale to 1:

```typescript
const isXLocked = dragHandle === 'top' || dragHandle === 'bottom'
const isYLocked = dragHandle === 'left' || dragHandle === 'right'

if (isXLocked) scale.x = 1
if (isYLocked) scale.y = 1
```

When holding Shift (or when shapes have incompatible rotations), we lock the aspect ratio. For edge handles, we copy the moving axis to the locked axis. For corner handles, we pick the axis that moved further and apply its scale to both dimensions:

```typescript
if (isAspectRatioLocked) {
	if (isYLocked) {
		scale.y = Math.abs(scale.x)
	} else if (isXLocked) {
		scale.x = Math.abs(scale.y)
	} else if (Math.abs(scale.x) > Math.abs(scale.y)) {
		scale.y = Math.abs(scale.x) * (scale.y < 0 ? -1 : 1)
	} else {
		scale.x = Math.abs(scale.y) * (scale.x < 0 ? -1 : 1)
	}
}
```

Negative scale values indicate the shape has flipped. We preserve the sign so we can detect this and update the cursor accordingly.

## Cursor updates during flip

As you drag a corner handle through the opposite corner, the shape mirrors. When this happens, the diagonal cursor direction should flip too—a northwest-southeast resize becomes northeast-southwest once the shape inverts.

The rule is: flip the cursor when the shape is mirrored on exactly one axis. If it's flipped on both axes or neither, the diagonal stays the same. This is an XOR condition:

```typescript
private updateCursor({
  dragHandle,
  isFlippedX,
  isFlippedY,
  rotation,
}: {
  dragHandle: SelectionCorner | SelectionEdge
  isFlippedX: boolean
  isFlippedY: boolean
  rotation: number
}) {
  const nextCursor = { ...this.editor.getInstanceState().cursor }

  switch (dragHandle) {
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
  }

  nextCursor.rotation = rotation
  this.editor.setCursor(nextCursor)
}
```

We call this each frame during the drag, checking if the scale is negative on each axis.

## Handle offset

When you click a resize handle, you rarely click exactly at its center. If we snapped the handle to the cursor, it would jump visibly. Instead, we calculate the offset between where you clicked and where the handle actually is, then maintain that offset throughout the drag:

```typescript
const dragHandlePoint = Vec.RotWith(
	selectionBounds.getHandlePoint(this.info.handle!),
	selectionBounds.point,
	selectionRotation
)

const cursorHandleOffset = Vec.Sub(originPagePoint, dragHandlePoint)
```

Both the current and origin points are adjusted by this offset when calculating the drag delta:

```typescript
const currentPagePoint = this.editor.inputs.getCurrentPagePoint().clone().sub(cursorHandleOffset)

const originPagePoint = this.editor.inputs.getOriginPagePoint().clone().sub(cursorHandleOffset)
```

This keeps the handle visually locked under the cursor during the entire gesture.

---

This lives in `/packages/tldraw/src/lib/tools/SelectTool/childStates/Resizing.ts`. The rotation math is in `/packages/editor/src/lib/primitives/Vec.ts`.

One constraint: shape snapping only works when the selection rotation is a multiple of 90 degrees. Snapping a rotated selection to the edges of other rotated shapes gets complicated quickly, so we skip it. Grid snapping still works because the grid is always axis-aligned.
