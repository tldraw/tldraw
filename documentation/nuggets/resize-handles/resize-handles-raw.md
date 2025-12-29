---
title: Resize handle positioning on rotated shapes - raw notes
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - resize
  - handles
  - shapes
status: published
date: 12/21/2025
order: 3
---

# Resize handle positioning on rotated shapes: raw notes

Internal research notes for the resize-handles.md article.

## Core problem

When shapes are rotated, resize handles need to:

1. Rotate with the shape visually
2. Maintain correct resize direction in shape-local coordinates
3. Display cursors oriented to the resize axis
4. Handle constraint behaviors (shift for aspect lock, alt for center-anchor)
5. Update cursor dynamically as shape flips during drag

Browser-provided cursors only support 8 fixed orientations, but rotated shapes need infinite cursor angles.

## Cursor implementation

**Source:** `/packages/editor/src/lib/hooks/useCursor.ts`

Browser provides only 8 resize cursors:

- `nwse-resize`, `nesw-resize` (diagonals)
- `ew-resize`, `ns-resize` (edges)
- Cannot be rotated via CSS

**Solution: SVG embedded in data URI**

Located in `useCursor.ts:12-34`:

```typescript
function getCursorCss(
	svg: string,
	r: number, // rotation in degrees
	tr: number, // additional rotation offset
	f: boolean, // flip flag
	color: string,
	hotspotX = 16,
	hotspotY = 16
) {
	const a = (-tr - r) * (PI / 180) // Convert to radians
	const s = Math.sin(a)
	const c = Math.cos(a)
	const dx = 1 * c - 1 * s // Rotated drop shadow offset
	const dy = 1 * s + 1 * c

	return `url("data:image/svg+xml,<svg height='32' width='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg' style='color: ${color};'>
    <defs>
      <filter id='shadow' y='-40%' x='-40%' width='180px' height='180%' color-interpolation-filters='sRGB'>
        <feDropShadow dx='${dx}' dy='${dy}' stdDeviation='1.2' flood-opacity='.5'/>
      </filter>
    </defs>
    <g fill='none' transform='rotate(${r + tr} 16 16)${f ? ` scale(-1,-1) translate(0, -32)` : ''}' filter='url(%23shadow)'>
      ${svg.replaceAll('"', "'")}
    </g>
  </svg>") ${hotspotX} ${hotspotY}, pointer`
}
```

**Cursor specifications:**

- Canvas size: 32x32 pixels
- Hotspot: (16, 16) - center of canvas
- Drop shadow always points "down" in screen space regardless of rotation
- Shadow offset uses rotation matrix: `[dx, dy] = rotate([1, 1], angle)`

**SVG cursor definitions** (lines 8-10):

```typescript
const CORNER_SVG = `<path d='m19.7432 17.0869-4.072 4.068 2.829 2.828-8.473-.013-.013-8.47 2.841 2.842 4.075-4.068 1.414-1.415-2.844-2.842h8.486v8.484l-2.83-2.827z' fill='%23fff'/><path d='m18.6826 16.7334-4.427 4.424 1.828 1.828-5.056-.016-.014-5.054 1.842 1.841 4.428-4.422 2.474-2.475-1.844-1.843h5.073v5.071l-1.83-1.828z' fill='%23000'/>`

const EDGE_SVG = `<path d='m9 17.9907v.005l5.997 5.996.001-3.999h1.999 2.02v4l5.98-6.001-5.98-5.999.001 4.019-2.021.002h-2l.001-4.022zm1.411.003 3.587-3.588-.001 2.587h3.5 2.521v-2.585l3.565 3.586-3.564 3.585-.001-2.585h-2.521l-3.499-.001-.001 2.586z' fill='%23fff'/><path d='m17.4971 18.9932h2.521v2.586l3.565-3.586-3.565-3.585v2.605h-2.521-3.5v-2.607l-3.586 3.587 3.586 3.586v-2.587z' fill='%23000'/>`

const ROTATE_CORNER_SVG = `<path d="M22.4789 9.45728L25.9935 12.9942L22.4789 16.5283V14.1032C18.126 14.1502 14.6071 17.6737 14.5675 22.0283H17.05L13.513 25.543L9.97889 22.0283H12.5674C12.6071 16.5691 17.0214 12.1503 22.4789 12.1031L22.4789 9.45728Z" fill="black"/><path fill-rule="evenodd" clip-rule="evenodd" d="..." fill="white"/>`
```

**Cursor type mapping** (lines 50-60):

```typescript
const CURSORS: Record<TLCursorType, CursorFunction> = {
	none: () => 'none',
	'ew-resize': (r, f, c) => getCursorCss(EDGE_SVG, r, 0, f, c),
	'ns-resize': (r, f, c) => getCursorCss(EDGE_SVG, r, 90, f, c),
	'nesw-resize': (r, f, c) => getCursorCss(CORNER_SVG, r, 0, f, c),
	'nwse-resize': (r, f, c) => getCursorCss(CORNER_SVG, r, 90, f, c),
	'nwse-rotate': (r, f, c) => getCursorCss(ROTATE_CORNER_SVG, r, 0, f, c),
	'nesw-rotate': (r, f, c) => getCursorCss(ROTATE_CORNER_SVG, r, 90, f, c),
	'senw-rotate': (r, f, c) => getCursorCss(ROTATE_CORNER_SVG, r, 180, f, c),
	'swne-rotate': (r, f, c) => getCursorCss(ROTATE_CORNER_SVG, r, 270, f, c),
}
```

Static cursors (don't rotate): `default`, `pointer`, `cross`, `move`, `grab`, `grabbing`, `text`, `zoom-in`, `zoom-out`

**Cursor application** (lines 72-88):

```typescript
useQuickReactor(
	'useCursor',
	() => {
		const { type, rotation } = editor.getInstanceState().cursor

		if (STATIC_CURSORS.includes(type)) {
			container.style.setProperty('--tl-cursor', `var(--tl-cursor-${type})`)
			return
		}

		container.style.setProperty(
			'--tl-cursor',
			getCursor(type, rotation, isDarkMode ? 'white' : 'black')
		)
	},
	[editor, container, isDarkMode]
)
```

Color is theme-dependent: white for dark mode, black for light mode.

## Scale calculation in shape space

**Source:** `/packages/tldraw/src/lib/tools/SelectTool/childStates/Resizing.ts:213-427`

Key insight: scale must be calculated in shape-local coordinate system, not screen coordinates.

**The problem with screen-space calculation:**

```typescript
// WRONG APPROACH:
const dragDelta = currentPoint.sub(startPoint)
const newBounds = selectionBounds.add(dragDelta)
const scale = newBounds.div(selectionBounds)
```

On a 45° rotated shape, dragging the "right" handle horizontally in screen space would try to stretch along screen X axis, but the shape's "width" is along its local X axis (rotated 45°).

**Correct approach** (lines 315-323):

```typescript
// Un-rotate the distances to shape's local coordinate system
const distanceFromScaleOriginNow = Vec.Sub(currentPagePoint, scaleOriginPage).rot(
	-selectionRotation
)

const distanceFromScaleOriginAtStart = Vec.Sub(originPagePoint, scaleOriginPage).rot(
	-selectionRotation
)

const scale = Vec.DivV(distanceFromScaleOriginNow, distanceFromScaleOriginAtStart)
```

**Vec.rot() implementation** (`/packages/editor/src/lib/primitives/Vec.ts:401-405`):

```typescript
static Rot(A: VecLike, r = 0): Vec {
  const s = Math.sin(r)
  const c = Math.cos(r)
  return new Vec(A.x * c - A.y * s, A.x * s + A.y * c)
}
```

Standard 2D rotation matrix:

```
[ cos(r)  -sin(r) ] [ x ]
[ sin(r)   cos(r) ] [ y ]
```

**Scale origin point** (lines 304-308):

```typescript
const scaleOriginPage = Vec.RotWith(
	altKey ? selectionBounds.center : selectionBounds.getHandlePoint(scaleOriginHandle),
	selectionBounds.point,
	selectionRotation
)
```

`scaleOriginHandle` is the opposite handle from the drag handle (calculated using `rotateSelectionHandle(dragHandle, Math.PI)`).

**Vec.RotWith() implementation** (`Vec.ts:407-413`):

```typescript
static RotWith(A: VecLike, C: VecLike, r: number): Vec {
  const x = A.x - C.x
  const y = A.y - C.y
  const s = Math.sin(r)
  const c = Math.cos(r)
  return new Vec(C.x + (x * c - y * s), C.y + (x * s + y * c))
}
```

Rotates point A around center C by r radians.

**Handling infinite/NaN scale values** (lines 325-326):

```typescript
if (!Number.isFinite(scale.x)) scale.x = 1
if (!Number.isFinite(scale.y)) scale.y = 1
```

Can occur when drag handle moves to exactly the scale origin point (division by zero).

**Axis locking** (lines 328-354):

```typescript
const isXLocked = dragHandle === 'top' || dragHandle === 'bottom'
const isYLocked = dragHandle === 'left' || dragHandle === 'right'

if (isAspectRatioLocked) {
	if (isYLocked) {
		// Dragging left or right edge: lock Y to X
		scale.y = Math.abs(scale.x)
	} else if (isXLocked) {
		// Dragging top or bottom edge: lock X to Y
		scale.x = Math.abs(scale.y)
	} else if (Math.abs(scale.x) > Math.abs(scale.y)) {
		// Corner drag: moved further in X dimension
		scale.y = Math.abs(scale.x) * (scale.y < 0 ? -1 : 1)
	} else {
		// Corner drag: moved further in Y dimension
		scale.x = Math.abs(scale.y) * (scale.x < 0 ? -1 : 1)
	}
} else {
	// Not holding shift, but still lock axes for edge handles
	if (isXLocked) scale.x = 1
	if (isYLocked) scale.y = 1
}
```

Aspect ratio lock triggered by:

- User holding shift key
- Shape's `canShapesDeform` is false (when shapes have incompatible rotations or locked aspect ratios)

## Handle name rotation

**Source:** `/packages/editor/src/lib/primitives/Box.ts:654-673`

Handle names describe position in shape-local coordinates, not screen position.

**Handle order array** (lines 654-663):

```typescript
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
```

8 handles arranged clockwise starting from top. Each handle is 45° (π/4 radians) from the next.

**Rotation function** (lines 666-673):

```typescript
export function rotateSelectionHandle(handle: SelectionHandle, rotation: number): SelectionHandle {
	// First find out how many tau we need to rotate by
	rotation = rotation % PI2 // Normalize to [0, 2π)
	const numSteps = Math.round(rotation / (PI / 4)) // Number of 45° steps

	const currentIndex = ORDERED_SELECTION_HANDLES.indexOf(handle)
	return ORDERED_SELECTION_HANDLES[(currentIndex + numSteps) % ORDERED_SELECTION_HANDLES.length]
}
```

Where:

- `PI2 = 2 * Math.PI` (full circle)
- `PI / 4` = 45° in radians
- Modulo operation wraps around the 8-handle array

**Finding opposite handle:**

```typescript
const scaleOriginHandle = rotateSelectionHandle(dragHandle, Math.PI)
```

Rotating by π (180°) gives the diagonally opposite handle.

**Duplicate implementation in Resizing.ts** (lines 568-586):
Same function duplicated in `/packages/tldraw/src/lib/tools/SelectTool/childStates/Resizing.ts:579-586` to avoid circular dependencies.

## Handle point calculation

**Source:** `/packages/editor/src/lib/primitives/Box.ts:274-293`

```typescript
getHandlePoint(handle: SelectionCorner | SelectionEdge) {
  switch (handle) {
    case 'top_left':
      return new Vec(this.x, this.y)
    case 'top_right':
      return new Vec(this.x + this.w, this.y)
    case 'bottom_left':
      return new Vec(this.x, this.y + this.h)
    case 'bottom_right':
      return new Vec(this.x + this.w, this.y + this.h)
    case 'top':
      return new Vec(this.x + this.w / 2, this.y)
    case 'right':
      return new Vec(this.x + this.w, this.y + this.h / 2)
    case 'bottom':
      return new Vec(this.x + this.w / 2, this.y + this.h)
    case 'left':
      return new Vec(this.x, this.y + this.h / 2)
  }
}
```

Returns points in the box's local coordinate system. Must be rotated to page space using `Vec.RotWith()` when needed.

## Cursor updates during drag

**Source:** `/packages/tldraw/src/lib/tools/SelectTool/childStates/Resizing.ts:432-467`

Cursor type changes as shape flips during resize.

**Update function** (lines 432-467):

```typescript
private updateCursor({
  dragHandle,
  isFlippedX,
  isFlippedY,
  rotation,
}: {
  dragHandle: SelectionCorner | SelectionEdge
  isFlippedX: boolean      // scale.x < 0
  isFlippedY: boolean      // scale.y < 0
  rotation: number
}) {
  const nextCursor = { ...this.editor.getInstanceState().cursor }

  switch (dragHandle) {
    case 'top_left':
    case 'bottom_right': {
      nextCursor.type = 'nwse-resize'
      if (isFlippedX !== isFlippedY) {  // XOR
        nextCursor.type = 'nesw-resize'
      }
      break
    }
    case 'top_right':
    case 'bottom_left': {
      nextCursor.type = 'nesw-resize'
      if (isFlippedX !== isFlippedY) {  // XOR
        nextCursor.type = 'nwse-resize'
      }
      break
    }
  }

  nextCursor.rotation = rotation
  this.editor.setCursor(nextCursor)
}
```

**XOR flip logic:**

- Diagonal cursor should flip when shape is mirrored on exactly one axis
- If flipped on both axes or neither axis, diagonal stays the same
- `isFlippedX !== isFlippedY` is the XOR condition

**When called** (lines 356-363):

```typescript
if (!this.info.isCreating) {
	this.updateCursor({
		dragHandle,
		isFlippedX: scale.x < 0,
		isFlippedY: scale.y < 0,
		rotation: selectionRotation,
	})
}
```

Not called during creation (cursor remains as `cross`).

## Cursor on hover (single selection)

**Source:** `/packages/tldraw/src/lib/tools/SelectTool/childStates/PointingResizeHandle.ts:28-35`

```typescript
private updateCursor() {
  const selected = this.editor.getSelectedShapes()
  const cursorType = CursorTypeMap[this.info.handle!]
  this.editor.setCursor({
    type: cursorType,
    rotation: selected.length === 1 ? this.editor.getSelectionRotation() : 0,
  })
}
```

**Cursor type mapping** (lines 3-17):

```typescript
const CursorTypeMap: Record<TLSelectionHandle, TLCursorType> = {
	bottom: 'ns-resize',
	top: 'ns-resize',
	left: 'ew-resize',
	right: 'ew-resize',
	bottom_left: 'nesw-resize',
	bottom_right: 'nwse-resize',
	top_left: 'nwse-resize',
	top_right: 'nesw-resize',
	bottom_left_rotate: 'swne-rotate',
	bottom_right_rotate: 'senw-rotate',
	top_left_rotate: 'nwse-rotate',
	top_right_rotate: 'nesw-rotate',
	mobile_rotate: 'grabbing',
}
```

**Multi-selection behavior:**

- If multiple shapes selected: `rotation: 0` (no rotation)
- If single shape: `rotation: editor.getSelectionRotation()`

This is a UX compromise - multi-selection has shapes with potentially different rotations, so a cursor that matches none of them would be confusing. Unrotated cursor is clearer.

## Handle rendering and positioning

**Source:** `/packages/tldraw/src/lib/canvas/TldrawSelectionForeground.tsx`

**Handle size calculations** (lines 66-86):

```typescript
const zoom = editor.getEfficientZoomLevel()

// Visual handle size (the visible square/rect)
const size = 8 / zoom

// Target area size (clickable/hoverable region)
const mobileHandleMultiplier = isCoarsePointer ? 1.75 : 1
const targetSize = (6 / zoom) * mobileHandleMultiplier

// Adjusted for small shapes
const targetSizeX = (isSmallX ? targetSize / 2 : targetSize) * (mobileHandleMultiplier * 0.75)
const targetSizeY = (isSmallY ? targetSize / 2 : targetSize) * (mobileHandleMultiplier * 0.75)
```

**Small shape detection** (lines 72-79):

```typescript
const isTinyX = width < size * 2
const isTinyY = height < size * 2

const isSmallX = width < size * 4
const isSmallY = height < size * 4
const isSmallCropX = width < size * 5
const isSmallCropY = height < size * 5
```

**Corner handle rendering** (lines 308-351):

```typescript
<ResizeHandle
  hide={hideTopLeftCorner}
  dataTestId="selection.target.top-left"
  ariaLabel={msg('handle.resize-top-left')}
  x={toDomPrecision(0 - (isSmallX ? targetSizeX * 2 : targetSizeX * 1.5))}
  y={toDomPrecision(0 - (isSmallY ? targetSizeY * 2 : targetSizeY * 1.5))}
  width={toDomPrecision(targetSizeX * 3)}
  height={toDomPrecision(targetSizeY * 3)}
  cursor={isDefaultCursor ? getCursor('nwse-resize', rotation) : undefined}
  events={topLeftEvents}
/>
```

Target areas:

- Normal: extends 1.5× targetSize beyond corner in each direction
- Small shapes: extends 2× targetSize to make easier to grab
- Total size: 3× targetSize in each dimension

**Visual handle rendering** (lines 353-395):

```typescript
{showResizeHandles && (
  <>
    <rect
      data-testid="selection.resize.top-left"
      className={classNames('tl-corner-handle', {
        'tl-hidden': hideTopLeftCorner,
      })}
      x={toDomPrecision(0 - size / 2)}
      y={toDomPrecision(0 - size / 2)}
      width={toDomPrecision(size)}
      height={toDomPrecision(size)}
    />
    {/* ... other corners ... */}
  </>
)}
```

Visual handles are centered on corner points, `size / 2` offset in each direction.

**Edge handle rendering** (lines 263-306):

```typescript
<ResizeHandle
  hide={hideHorizontalEdgeTargets}
  dataTestId="selection.resize.right"
  ariaLabel={msg('handle.resize-right')}
  x={toDomPrecision(width - (isSmallX ? 0 : targetSizeX))}
  y={0}
  height={toDomPrecision(height)}
  width={toDomPrecision(Math.max(1, targetSizeX * 2))}
  cursor={isDefaultCursor ? getCursor('ew-resize', rotation) : undefined}
  events={rightEvents}
/>
```

Edge targets:

- Span full height/width of selection
- Width/height: 2× targetSize
- Position: offset by targetSize from edge (0 offset for small shapes)

**Transform application** (lines 59-62):

```typescript
useTransform(rSvg, bounds?.x, bounds?.y, 1, selectionRotation, {
	x: expandedBounds.x - bounds.x,
	y: expandedBounds.y - bounds.y,
})
```

Entire SVG is transformed:

1. Translate to bounds position
2. Rotate by selectionRotation
3. Apply expansion offset

Handles are defined in local coordinates, then the whole SVG rotates, so handles rotate with it.

## Cursor handle offset

**Source:** `/packages/tldraw/src/lib/tools/SelectTool/childStates/Resizing.ts:234-277`

Problem: User clicks inside the handle target area, but not exactly at the handle point. Need to offset calculations so it appears the handle is under the cursor.

**Calculation in snapshot** (lines 484-490):

```typescript
const dragHandlePoint = Vec.RotWith(
	selectionBounds.getHandlePoint(this.info.handle!),
	selectionBounds.point,
	selectionRotation
)

const cursorHandleOffset = Vec.Sub(originPagePoint, dragHandlePoint)
```

Where:

- `originPagePoint` = where user actually clicked (from `editor.inputs.getOriginPagePoint()`)
- `dragHandlePoint` = mathematical center of the handle
- `cursorHandleOffset` = difference between the two

**Diagram from source** (lines 239-266):

```
                         │
                         │
                         │ corner handle
                     ┌───┴───┐
   selection         │       │
  ───────────────────┤   x◄──┼──── drag handle point   ▲
                     │       │                         │
                     └───────┘                         ├─ cursorHandleOffset.y
                                                       │
        originPagePoint───────►x─┐                     ▼
                               │ └─┐
                               │   └─┐
                               │     │ mouse (sorry)
                               └──┐ ┌┘
                                  │ │
                                  └─┘
                         ◄──┬──►
                            │
                   cursorHandleOffset.x
```

**Application during drag** (lines 270-277):

```typescript
const currentPagePoint = this.editor.inputs
	.getCurrentPagePoint()
	.clone()
	.sub(cursorHandleOffset)
	.sub(this.creationCursorOffset)

const originPagePoint = this.editor.inputs.getOriginPagePoint().clone().sub(cursorHandleOffset)
```

Both current and origin points are adjusted by the same offset, so the handle appears to be directly under the cursor during the entire drag.

## Grid snapping

**Source:** `Resizing.ts:278-300`

```typescript
if (this.editor.getInstanceState().isGridMode && !isHoldingAccel) {
	const { gridSize } = this.editor.getDocumentSettings()
	currentPagePoint.snapToGrid(gridSize)
}

const shouldSnap = this.editor.user.getIsSnapMode() ? !isHoldingAccel : isHoldingAccel

if (shouldSnap && selectionRotation % HALF_PI === 0) {
	const { nudge } = this.editor.snaps.shapeBounds.snapResizeShapes({
		dragDelta: Vec.Sub(currentPagePoint, originPagePoint),
		initialSelectionPageBounds: this.snapshot.initialSelectionPageBounds,
		handle: rotateSelectionHandle(dragHandle, selectionRotation),
		isAspectRatioLocked,
		isResizingFromCenter: altKey,
	})

	currentPagePoint.add(nudge)
}
```

Where:

- `HALF_PI = Math.PI / 2` (90°)
- `isHoldingAccel` = Cmd/Ctrl key

**Snap conditions:**

1. Grid mode: Always snap to grid (unless holding Cmd/Ctrl)
2. Shape snapping: Only when selection rotation is multiple of 90° (to avoid complex rotated snapping)

**Snap mode toggle:**

- If snap mode enabled: hold Cmd/Ctrl to temporarily disable
- If snap mode disabled: hold Cmd/Ctrl to temporarily enable

## Special case: Text shape resize

**Source:** `Resizing.ts:228-233`

```typescript
if (shapeSnapshots.size === 1) {
	const onlySnapshot = [...shapeSnapshots.values()][0]!
	if (this.editor.isShapeOfType(onlySnapshot.shape, 'text')) {
		isAspectRatioLocked = !(this.info.handle === 'left' || this.info.handle === 'right')
	}
}
```

Text shapes:

- Can resize width freely via left/right handles
- Top/bottom handles lock aspect ratio (preserve width, adjust height based on text wrapping)
- Corner handles lock aspect ratio

## Special case: Frame resize with children

**Source:** `Resizing.ts:384-427`

When resizing a frame while holding Cmd/Ctrl, children stay in absolute page position (cropping effect).

```typescript
if (isHoldingAccel) {
	this.didHoldCommand = true

	for (const { id, children } of frames) {
		if (!children.length) continue
		const initial = shapeSnapshots.get(id)!.shape
		const current = this.editor.getShape(id)!
		if (!(initial && current)) continue

		const dx = current.x - initial.x
		const dy = current.y - initial.y

		const delta = new Vec(dx, dy).rot(-initial.rotation)

		if (delta.x !== 0 || delta.y !== 0) {
			for (const child of children) {
				this.editor.updateShape({
					id: child.id,
					type: child.type,
					x: child.x - delta.x,
					y: child.y - delta.y,
				})
			}
		}
	}
}
```

Children positions updated to counteract the frame's position change, keeping them visually in the same spot.

## Angle compatibility

**Source:** `/packages/editor/src/lib/primitives/utils.ts:191-193`

```typescript
export function areAnglesCompatible(a: number, b: number) {
	return a === b || approximately((a % (Math.PI / 2)) - (b % (Math.PI / 2)), 0)
}
```

Where:

```typescript
export function approximately(a: number, b: number, precision = 0.000001): boolean {
	return Math.abs(a - b) < precision
}
```

Two angles are "compatible" if they differ by a multiple of 90°. Used to determine if shapes in multi-selection can deform together.

**Usage in Resizing** (lines 548-551):

```typescript
const canShapesDeform = ![...shapeSnapshots.values()].some(
	(shape) =>
		!areAnglesCompatible(shape.pageRotation, selectionRotation) || shape.isAspectRatioLocked
)
```

If any shape has incompatible rotation or locked aspect ratio, all shapes' aspect ratios are locked during resize.

## Constants and configuration

**Mathematical constants** (`/packages/editor/src/lib/primitives/utils.ts:14-18`):

```typescript
export const PI = Math.PI
export const HALF_PI = PI / 2 // 90° in radians
export const PI2 = PI * 2 // 360° in radians (full circle)
```

**Handle visual sizes** (`TldrawSelectionForeground.tsx:72-86`):

- Visual handle size: `8 / zoom` (gets smaller as you zoom in)
- Base target size: `6 / zoom`
- Mobile multiplier: `1.75` for coarse pointers, `1` for precise
- Target multiplier: `0.75` after mobile adjustment
- Total target size: 3× targetSize in each dimension

**Handle hiding thresholds:**

- Tiny: `width < size * 2` or `height < size * 2`
- Small: `width < size * 4` or `height < size * 4`
- Small crop: `width < size * 5` or `height < size * 5`

**Text handle sizing** (line 188):

```typescript
const textHandleHeight = Math.min(24 / zoom, height - targetSizeY * 3)
```

Minimum visible height: `4` zoom-adjusted pixels (line 194).

## Selection handle types

**TypeScript types:**

```typescript
type SelectionCorner = 'top_left' | 'top_right' | 'bottom_right' | 'bottom_left'
type SelectionEdge = 'top' | 'right' | 'bottom' | 'left'
type SelectionHandle = SelectionCorner | SelectionEdge
type RotateCorner =
	| 'top_left_rotate'
	| 'top_right_rotate'
	| 'bottom_right_rotate'
	| 'bottom_left_rotate'
	| 'mobile_rotate'
type TLSelectionHandle = SelectionHandle | RotateCorner
```

Total: 12 handle types (4 corners + 4 edges + 4 rotate corners + 1 mobile rotate).

## Resize modes

**Source:** `Resizing.ts:373-376`

```typescript
mode:
  selectedShapeIds.length === 1 && id === selectedShapeIds[0]
    ? 'resize_bounds'
    : 'scale_shape',
```

Two modes:

- `resize_bounds`: Single selected shape - resize by adjusting bounds
- `scale_shape`: Multi-selection or non-selected shapes in group - apply scale transform

Different shapes handle these modes differently in their ShapeUtil implementations.

## Key files and line numbers

- `/packages/tldraw/src/lib/tools/SelectTool/childStates/Resizing.ts`
  - Lines 213-427: `updateShapes()` method with core resize logic
  - Lines 315-323: Scale calculation in shape space
  - Lines 304-308: Scale origin calculation
  - Lines 332-354: Aspect ratio locking
  - Lines 432-467: Cursor update with flip handling
  - Lines 568-586: Handle rotation function
  - Lines 475-563: Snapshot creation with handle offset calculation

- `/packages/editor/src/lib/hooks/useCursor.ts`
  - Lines 12-34: SVG cursor generation
  - Lines 8-10: SVG cursor definitions
  - Lines 50-60: Cursor type mapping
  - Lines 72-88: Cursor application

- `/packages/editor/src/lib/primitives/Box.ts`
  - Lines 654-673: Handle rotation function
  - Lines 274-293: Handle point calculation

- `/packages/tldraw/src/lib/tools/SelectTool/childStates/PointingResizeHandle.ts`
  - Lines 28-35: Cursor update on hover
  - Lines 3-17: Cursor type mapping

- `/packages/tldraw/src/lib/canvas/TldrawSelectionForeground.tsx`
  - Lines 66-86: Handle size calculations
  - Lines 263-351: Handle rendering (targets)
  - Lines 353-395: Visual handle rendering
  - Lines 59-62: Transform application

- `/packages/editor/src/lib/primitives/Vec.ts`
  - Lines 401-405: `Vec.Rot()` rotation
  - Lines 407-413: `Vec.RotWith()` rotation around point
  - Lines 293-294: `Vec.DivV()` component-wise division

- `/packages/editor/src/lib/primitives/utils.ts`
  - Lines 14-18: Mathematical constants
  - Lines 191-193: `areAnglesCompatible()` function
