---
title: Resize handle positioning on rotated shapes
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - resize
  - handles
  - shapes
status: published
date: 12/21/2025
order: 4
---

# Resize handle positioning on rotated shapes

A rectangle's resize handles sit at its corners and edge midpoints. Drag the top-right handle, the shape grows up and to the right. Simple enough—until you rotate the shape 45 degrees. Now that "top-right" handle is pointing straight up, but dragging it should still resize from that corner. And the cursor needs to point in the right direction. The math gets surprisingly subtle.

## The problem with rotation

When you rotate a shape, several things need to change together:

1. **Handle positions**: The handles rotate with the shape (obviously)
2. **Resize direction**: Dragging the handle should resize in the shape's local coordinate system
3. **Cursor orientation**: The arrow cursor should point along the resize axis in screen space
4. **Constraint behavior**: Shift-drag for aspect ratio lock, alt-drag for center-anchor

The naive approach—just apply rotation to everything—breaks down because cursors and constraints operate in screen space while resize math needs shape space. You have to carefully transform between coordinate systems.

## Cursors are embedded SVGs

Browsers give you about eight resize cursors: `nwse-resize`, `nesw-resize`, `ew-resize`, `ns-resize`, and their aliases. That's nowhere near enough. When a shape is rotated 30 degrees, you need a cursor rotated 30 degrees—and CSS doesn't let you rotate a cursor.

The solution: render the cursor as an SVG embedded in a data URI, with a rotation transform baked in:

```typescript
// packages/editor/src/lib/hooks/useCursor.ts
function getCursorCss(svg: string, r: number, tr: number, ...) {
  const a = (-tr - r) * (PI / 180)
  const s = Math.sin(a)
  const c = Math.cos(a)
  const dx = 1 * c - 1 * s  // Drop shadow offset
  const dy = 1 * s + 1 * c

  return `url("data:image/svg+xml,<svg ...>
    <g transform='rotate(${r + tr} 16 16)'>
      ${svg}
    </g>
  </svg>") 16 16, pointer`
}
```

The cursor is a 32x32 SVG with the hotspot at (16, 16)—the center. When the shape rotates, we regenerate the entire cursor CSS with a new rotation angle. The drop shadow offset (dx, dy) is also rotated so it always falls "down" in screen space regardless of cursor orientation.

This gives us infinite cursor angles, not just the eight browser defaults. It's more work, but it means the cursor always points exactly along the resize axis.

## Scale calculation in shape space

Here's where the rotation math gets non-obvious. When you drag a resize handle, you need to calculate how much the shape should scale. The intuitive approach:

```typescript
// WRONG: Calculate scale in screen space
const dragDelta = currentPoint.sub(startPoint)
const scale = selectionBounds.add(dragDelta).div(selectionBounds)
```

This produces weird results on rotated shapes. Dragging the "right" handle horizontally should make the shape wider, but on a 45-degree rotated shape, "wider" means growing along the shape's local X axis, not screen X.

The correct approach: un-rotate the drag vector to shape space, then calculate scale:

```typescript
// packages/tldraw/src/lib/tools/SelectTool/childStates/Resizing.ts

// Un-rotate distances to shape's local coordinate system
const distanceFromOriginNow = Vec.Sub(currentPagePoint, scaleOriginPage).rot(-selectionRotation)

const distanceFromOriginAtStart = Vec.Sub(originPagePoint, scaleOriginPage).rot(-selectionRotation)

const scale = Vec.DivV(distanceFromOriginNow, distanceFromOriginAtStart)
```

The `.rot(-selectionRotation)` is the key. By counter-rotating the distances, we're measuring how far the pointer moved along the shape's local axes, not screen axes. A horizontal screen drag on a 45-degree shape becomes a diagonal drag in shape space—exactly what we need for proper resize behavior.

## Handle names rotate

The handle you clicked on has a name: `top_left`, `right`, `bottom_right`, etc. But these names describe the handle's position in the shape's local coordinate system, not where it appears on screen. When the shape rotates 180 degrees, the `top_left` handle is visually at the bottom right.

This matters for finding the anchor point during resize. Dragging the `top_left` handle should anchor from `bottom_right`. But if the selection is rotated 90 degrees, the visual "opposite corner" has a different name.

```typescript
// packages/editor/src/lib/primitives/Box.ts
const ORDERED_SELECTION_HANDLES = [
	'top',
	'top_right',
	'right',
	'bottom_right',
	'bottom',
	'bottom_left',
	'left',
	'top_left',
] as const

export function rotateSelectionHandle(handle: SelectionHandle, rotation: number) {
	const numSteps = Math.round(rotation / (PI / 4)) // 45° increments
	const currentIndex = ORDERED_SELECTION_HANDLES.indexOf(handle)
	return ORDERED_SELECTION_HANDLES[(currentIndex + numSteps) % 8]
}
```

To find the opposite handle, rotate by π (180 degrees):

```typescript
const scaleOriginHandle = rotateSelectionHandle(dragHandle, Math.PI)
```

This function appears throughout the resize code—anywhere we need to map between local handle identity and screen position.

## Cursor flips during drag

When you drag a resize handle past the opposite edge, the shape "flips"—scale becomes negative on one axis. The cursor needs to change too. If you're dragging the `top_left` handle and flip horizontally, you're now effectively dragging what would be the `top_right` handle.

```typescript
// packages/tldraw/src/lib/tools/SelectTool/childStates/Resizing.ts
private updateCursor({ dragHandle, isFlippedX, isFlippedY, rotation }) {
  switch (dragHandle) {
    case 'top_left':
    case 'bottom_right': {
      nextCursor.type = 'nwse-resize'
      // XOR flip: if flipped on exactly one axis, switch diagonal
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
}
```

The XOR check (`isFlippedX !== isFlippedY`) is elegant: a diagonal cursor should flip when the shape is mirrored on exactly one axis. Mirror both or neither, and the diagonal stays the same.

## Multi-selection loses rotation

When multiple shapes are selected, each might have a different rotation. What rotation should the cursor use?

The answer: none. Multi-selection cursors don't rotate.

```typescript
// packages/tldraw/src/lib/tools/SelectTool/childStates/PointingResizeHandle.ts
this.editor.setCursor({
	type: cursorType,
	rotation: selected.length === 1 ? this.editor.getSelectionRotation() : 0,
})
```

This is a UX compromise. We could pick the "dominant" rotation, average the rotations, or use the selection bounds rotation. But none of these feel right. A cursor that doesn't quite match any shape is more confusing than a standard unrotated cursor. Users understand that multi-selection is an approximation.

## Constraints in rotated space

Shift-drag locks aspect ratio. Alt-drag anchors from center instead of the opposite corner. Both of these need to work correctly on rotated shapes.

The aspect ratio constraint is applied after un-rotating to shape space:

```typescript
if (isAspectRatioLocked) {
	if (Math.abs(scale.x) > Math.abs(scale.y)) {
		// Dragged further in X: lock Y to X
		scale.y = Math.abs(scale.x) * (scale.y < 0 ? -1 : 1)
	} else {
		// Dragged further in Y: lock X to Y
		scale.x = Math.abs(scale.y) * (scale.x < 0 ? -1 : 1)
	}
}
```

Because we've already un-rotated to shape space, "X" and "Y" here refer to the shape's local axes. This is correct: aspect ratio means maintaining the ratio of the shape's own width to height, regardless of how it's oriented on screen.

Center-anchoring just changes the scale origin point:

```typescript
const scaleOriginPage = Vec.RotWith(
	altKey ? selectionBounds.center : selectionBounds.getHandlePoint(scaleOriginHandle),
	selectionBounds.point,
	selectionRotation
)
```

The scale origin is still rotated to page space, but it's the center of the bounds instead of the opposite corner.

## Why this complexity matters

You could skip all this and just resize in screen space. The shape would grow in the direction you drag. But it would feel wrong—subtly at first, then obviously when you try to make a rotated shape slightly taller or snap it to a grid. The resize would fight the shape's orientation instead of respecting it.

Getting this right takes careful coordinate transforms, dynamic cursor generation, and a bunch of special cases. But the result is that rotated shapes resize exactly like you'd expect. The complexity is hidden; the UX is simple.

## Key files

- `packages/tldraw/src/lib/tools/SelectTool/childStates/Resizing.ts` — Scale calculation and cursor updates
- `packages/editor/src/lib/hooks/useCursor.ts` — SVG cursor generation with rotation
- `packages/editor/src/lib/primitives/Box.ts:666` — Handle name rotation function
- `packages/tldraw/src/lib/tools/SelectTool/childStates/PointingResizeHandle.ts` — Initial cursor setup on hover
- `packages/tldraw/src/lib/canvas/TldrawSelectionForeground.tsx` — Handle rendering and visibility
