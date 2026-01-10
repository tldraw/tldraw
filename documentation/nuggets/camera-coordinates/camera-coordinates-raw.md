---
title: Camera and Coordinate System - Raw Notes and Implementation Details
created_at: 01/10/2026
updated_at: 01/10/2026
keywords:
  - camera
  - coordinates
  - viewport
  - zoom
  - pan
  - screen
  - page
  - transform
status: draft
date: 01/10/2026
order: 1
---

# Camera and Coordinate System - Raw Notes and Implementation Details

## Core Implementation Files

### Camera Record

- **File**: `/packages/tlschema/src/records/TLCamera.ts`
- **Structure**: Simple `{x, y, z, meta}` where z is zoom

### Coordinate Transformations

- **File**: `/packages/editor/src/lib/editor/Editor.ts:3782-3867`
- **Methods**: `screenToPage`, `pageToScreen`, `pageToViewport`

### Camera Manipulation

- **File**: `/packages/editor/src/lib/editor/Editor.ts:3148-3640`
- **Methods**: `setCamera`, `centerOnPoint`, `zoomIn`, `zoomOut`, `zoomToBounds`

### Camera Constraints

- **File**: `/packages/editor/src/lib/editor/types/misc-types.ts:76-183`
- **Types**: `TLCameraMoveOptions`, `TLCameraOptions`, `TLCameraConstraints`

### Gesture Handling

- **File**: `/packages/editor/src/lib/hooks/useGestureEvents.ts`

## Camera Record Structure

**Location**: `/packages/tlschema/src/records/TLCamera.ts`

```typescript
export interface TLCamera extends BaseRecord<'camera', TLCameraId> {
  /** Camera x position. Negative values move the viewport right */
  x: number
  /** Camera y position. Negative values move the viewport down */
  y: number
  /** Zoom level. 1 = 100%, 0.5 = 50% zoom, 2 = 200% zoom */
  z: number
  /** User-defined metadata for the camera */
  meta: JsonObject
}
```

**Key properties**:
- **x, y**: Pan position in page space. Negative x moves viewport right; negative y moves viewport down
- **z**: Zoom multiplier where 1.0 = 100%, 0.5 = 50% (zoomed out), 2.0 = 200% (zoomed in)
- **meta**: Optional metadata for storing per-user state (useful in multiplayer)
- **Defaults**: x=0, y=0, z=1, meta={}

**Mental model**: The camera defines what portion of the infinite page is visible. The (x, y) values represent the offset from the origin, and z scales everything.

## Three Coordinate Spaces

The system manages three distinct coordinate spaces:

### 1. Screen Space

- Browser pixels relative to the window
- Coordinates come from DOM events (`clientX`, `clientY`)
- Fixed to the browser window
- Includes any scroll offset of the page

### 2. Page Space

- Infinite canvas coordinates
- The logical coordinate system where shapes exist
- Pan and zoom transformations apply here
- Shapes store their positions in page space

### 3. Viewport Space

- Relative to the editor container element
- Used for positioning DOM overlays in `InFrontOfTheCanvas`
- Similar to page space but accounts for container position
- Independent of browser window scroll offset

**Example usage**:

```typescript
const screenPoint = { x: e.clientX, y: e.clientY }
const pagePoint = editor.screenToPage(screenPoint)
const viewportPoint = editor.pageToViewport(pagePoint)
```

## Coordinate Transformation Methods

### screenToPage(point)

**Location**: `/packages/editor/src/lib/editor/Editor.ts:3820-3828`

Converts screen coordinates (from DOM events) to page coordinates:

```typescript
screenToPage(point: VecLike) {
  const { screenBounds } = this.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!
  const { x: cx, y: cy, z: cz = 1 } = this.getCamera()
  return new Vec(
    (point.x - screenBounds.x) / cz - cx,
    (point.y - screenBounds.y) / cz - cy,
    point.z ?? 0.5
  )
}
```

**Algorithm**:
1. Subtract `screenBounds` offset (accounts for editor container position in page)
2. Divide by zoom (`cz`) to convert screen pixels to page units
3. Subtract camera pan (`cx`, `cy`) to get final page position

**Formula**:
```
pageX = (screenX - screenBounds.x) / zoom - cameraPanX
pageY = (screenY - screenBounds.y) / zoom - cameraPanY
```

**Why this works**: Screen pixels need to be:
- Offset by the container position (screenBounds)
- Scaled by inverse zoom (zoomed in = fewer page units per pixel)
- Shifted by camera pan (camera at x=100 means page x=0 is 100 pixels into viewport)

### pageToScreen(point)

**Location**: `/packages/editor/src/lib/editor/Editor.ts:3842-3850`

Inverse transformation - converts page coordinates to screen coordinates:

```typescript
pageToScreen(point: VecLike) {
  const { screenBounds } = this.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!
  const { x: cx, y: cy, z: cz = 1 } = this.getCamera()
  return new Vec(
    (point.x + cx) * cz + screenBounds.x,
    (point.y + cy) * cz + screenBounds.y,
    point.z ?? 0.5
  )
}
```

**Formula**:
```
screenX = (pageX + cameraPanX) * zoom + screenBounds.x
screenY = (pageY + cameraPanY) * zoom + screenBounds.y
```

### pageToViewport(point)

**Location**: `/packages/editor/src/lib/editor/Editor.ts:3864-3867`

Converts page coordinates to viewport space (for DOM overlay positioning):

```typescript
pageToViewport(point: VecLike) {
  const { x: cx, y: cy, z: cz = 1 } = this.getCamera()
  return new Vec((point.x + cx) * cz, (point.y + cy) * cz, point.z ?? 0.5)
}
```

**Key difference from pageToScreen**: No `screenBounds` offset. This is useful for positioning elements inside the editor container that are already offset by the container's position.

**Use case**: The `InFrontOfTheCanvas` component slot uses viewport coordinates to position DOM elements over the canvas without needing to know where the editor is in the browser window.

## Viewport Bounds

### getViewportScreenBounds()

**Location**: `/packages/editor/src/lib/editor/Editor.ts:3782-3785`

```typescript
@computed getViewportScreenBounds() {
  const { x, y, w, h } = this.getInstanceState().screenBounds
  return new Box(x, y, w, h)
}
```

Returns the viewport dimensions in screen space - typically the editor container's size and position.

### getViewportPageBounds()

**Location**: `/packages/editor/src/lib/editor/Editor.ts:3802-3806`

```typescript
@computed getViewportPageBounds() {
  const { w, h } = this.getViewportScreenBounds()
  const { x: cx, y: cy, z: cz } = this.getCamera()
  return new Box(-cx, -cy, w / cz, h / cz)
}
```

Returns the visible area of the page in page coordinates.

**Key insights**:
- **Position** is the negative of camera pan (`-cx`, `-cy`)
- **Size** scales inversely with zoom (`w / cz`, `h / cz`)
- At zoom 2 (200%), the viewport shows half as much content
- At zoom 0.5 (50%), the viewport shows twice as much content

**Formula**:
```typescript
viewportPageBounds = {
  x: -cameraPanX,
  y: -cameraPanY,
  width: screenBounds.width / zoom,
  height: screenBounds.height / zoom
}
```

**Test evidence**:

```typescript
// At zoom 2, viewport page bounds are half the screen size
editor.setCamera({ x: 0, y: 0, z: 2 })
expect(editor.getViewportPageBounds()).toMatchObject({
  x: 0, y: 0, w: 500, h: 500  // 1000 / 2
})

// When panned, viewport moves in page space
editor.setCamera({ x: 100, y: 100, z: 1 })
expect(editor.getViewportPageBounds()).toMatchObject({
  x: -100, y: -100, w: 1000, h: 1000
})
```

## Camera Manipulation Methods

### setCamera(point, opts)

**Location**: `/packages/editor/src/lib/editor/Editor.ts:3148-3183`

The primary method for setting camera position and zoom:

```typescript
setCamera(point: VecLike, opts?: TLCameraMoveOptions): this {
  const { isLocked } = this._cameraOptions.__unsafe__getWithoutCapture()
  if (isLocked && !opts?.force) return this

  this.stopCameraAnimation()
  if (this.getInstanceState().followingUserId) {
    this.stopFollowingUser()
  }

  const _point = Vec.Cast(point)

  // Clamp to valid numbers
  if (!Number.isFinite(_point.x)) _point.x = 0
  if (!Number.isFinite(_point.y)) _point.y = 0
  if (_point.z === undefined || !Number.isFinite(_point.z)) {
    _point.z = this.getZoomLevel()
  }

  const camera = this.getConstrainedCamera(_point, opts)

  if (opts?.animation) {
    this._animateToViewport(new Box(...), opts)
  } else {
    this._setCamera(camera, { ...opts, force: true })
  }

  return this
}
```

**Features**:
- Respects camera lock (unless `force: true`)
- Stops any running animation
- Stops following other users
- Validates numeric inputs
- Applies constraints
- Supports animation option

### centerOnPoint(point, opts)

**Location**: `/packages/editor/src/lib/editor/Editor.ts:3199-3206`

Centers the viewport on a specific page coordinate:

```typescript
centerOnPoint(point: VecLike, opts?: TLCameraMoveOptions): this {
  const { width: pw, height: ph } = this.getViewportPageBounds()
  this.setCamera(
    new Vec(-(point.x - pw / 2), -(point.y - ph / 2), this.getCamera().z),
    opts
  )
  return this
}
```

**Algorithm**: Calculates the camera position that places `point` at the center of the viewport, maintaining current zoom level.

### zoomIn(point, opts)

**Location**: `/packages/editor/src/lib/editor/Editor.ts:3285-3313`

Zooms to the next zoom step, keeping `point` centered:

```typescript
zoomIn(point = this.getViewportScreenBounds().center, opts?: TLCameraMoveOptions): this {
  const { zoomSteps } = this.getCameraOptions()
  const baseZoom = this.getBaseZoom()

  // Find current zoom step
  const currentZoomStep = Math.round(currentZoom / baseZoom * 100) / 100

  // Find next step up
  const nextZoomStep = zoomSteps.find(step => step > currentZoomStep)

  if (nextZoomStep !== undefined) {
    this.zoomToBounds(/* bounds centered on point at new zoom */, opts)
  }

  return this
}
```

**Default zoom steps** (from `/packages/editor/src/lib/constants.ts:10`):
```typescript
zoomSteps: [0.05, 0.1, 0.25, 0.5, 1, 2, 4, 8]
```

These are multipliers against `baseZoom`. With baseZoom of 1, actual zoom levels are 5%, 10%, 25%, 50%, 100%, 200%, 400%, 800%.

### zoomOut(point, opts)

**Location**: `/packages/editor/src/lib/editor/Editor.ts:3330-3358`

Zooms to the previous zoom step. Same logic as `zoomIn` but finds the next step down.

### resetZoom(point, opts)

**Location**: `/packages/editor/src/lib/editor/Editor.ts:3244-3268`

Resets zoom to the initial zoom level (100% or constraint-based `baseZoom`):

```typescript
resetZoom(point = this.getViewportScreenBounds().center, opts?: TLCameraMoveOptions): this {
  const baseZoom = this.getBaseZoom()
  const currentZoom = this.getZoomLevel()

  if (currentZoom === baseZoom) return this

  // Calculate new camera to keep point centered at baseZoom
  this.zoomToBounds(/* bounds at baseZoom centered on point */, opts)

  return this
}
```

### zoomToBounds(bounds, opts)

**Location**: `/packages/editor/src/lib/editor/Editor.ts:3437-3476`

Fits a bounding box in the viewport with padding:

```typescript
zoomToBounds(bounds: BoxLike, opts?: {
  targetZoom?: number
  inset?: number
} & TLCameraMoveOptions): this {
  const viewportScreenBounds = this.getViewportScreenBounds()

  // Default padding: 128px or 28% of viewport width, whichever is smaller
  const inset = opts?.inset ?? Math.min(
    this.options.zoomToFitPadding,  // Default: 128
    viewportScreenBounds.width * 0.28
  )

  // Calculate zoom to fit bounds with padding
  let zoom = clamp(
    Math.min(
      (viewportScreenBounds.width - inset) / bounds.w,
      (viewportScreenBounds.height - inset) / bounds.h
    ),
    zoomMin * baseZoom,
    zoomMax * baseZoom
  )

  // Optional: cap at target zoom
  if (opts?.targetZoom !== undefined) {
    zoom = Math.min(opts.targetZoom, zoom)
  }

  // Center bounds in viewport
  this.setCamera(
    new Vec(
      -bounds.x + (viewportScreenBounds.width - bounds.w * zoom) / 2 / zoom,
      -bounds.y + (viewportScreenBounds.height - bounds.h * zoom) / 2 / zoom,
      zoom
    ),
    opts
  )

  return this
}
```

**Algorithm breakdown**:
1. Calculate required zoom: `(viewport_size - inset) / bounds_size` for each axis
2. Take minimum to fit both dimensions
3. Clamp to min/max zoom constraints
4. Apply optional `targetZoom` cap
5. Center bounds with formula: `-bounds.x + (viewport_size - bounds_scaled_width) / 2 / zoom`

### zoomToFit(opts)

**Location**: `/packages/editor/src/lib/editor/Editor.ts:3221-3227`

Zooms to fit all shapes on the current page:

```typescript
zoomToFit(opts?: TLCameraMoveOptions): this {
  const pageBounds = this.getCurrentPageBounds()
  if (pageBounds) {
    this.zoomToBounds(pageBounds, opts)
  }
  return this
}
```

### zoomToSelection(opts)

**Location**: `/packages/editor/src/lib/editor/Editor.ts:3373-3392`

Zooms to fit selected shapes. Has smart behavior:
- If already at 100%, zooms to fit selection
- If at different zoom, zooms to 100% centered on selection

### slideCamera(opts)

**Location**: `/packages/editor/src/lib/editor/Editor.ts:3592-3640`

Pans camera with friction/momentum decay for inertial scrolling:

```typescript
slideCamera(opts: {
  speed: number
  direction: VecLike
  friction?: number        // Default: 0.09
  speedThreshold?: number  // Default: 0.01
}): this {
  let currentSpeed = opts.speed
  const direction = Vec.Cast(opts.direction).norm()
  const friction = opts.friction ?? 0.09
  const speedThreshold = opts.speedThreshold ?? 0.01

  const moveCamera = (elapsed: number) => {
    const { x: cx, y: cy, z: cz } = this.getCamera()
    const movementVec = Vec.Mul(direction, (currentSpeed * elapsed) / cz)

    // Apply friction decay
    currentSpeed *= 1 - friction

    if (currentSpeed < speedThreshold) {
      this.off('tick', moveCamera)
    } else {
      this._setCamera(new Vec(cx + movementVec.x, cy + movementVec.y, cz))
    }
  }

  this.on('tick', moveCamera)
  return this
}
```

**Algorithm**: Each frame multiplies speed by `(1 - friction)`, creating exponential decay. Stops when speed drops below threshold.

## Camera Constraints

### TLCameraMoveOptions

**Location**: `/packages/editor/src/lib/editor/types/misc-types.ts:76-90`

```typescript
export interface TLCameraMoveOptions {
  /** Move camera immediately vs on next tick */
  immediate?: boolean
  /** Force movement even if camera is locked */
  force?: boolean
  /** Reset to default position and zoom */
  reset?: boolean
  /** Animation configuration */
  animation?: {
    duration?: number
    easing?(t: number): number
  }
}
```

### TLCameraOptions

**Location**: `/packages/editor/src/lib/editor/types/misc-types.ts:93-111`

```typescript
export interface TLCameraOptions {
  isLocked: boolean         // Prevent camera changes
  panSpeed: number          // Multiplier for pan gestures (default: 1)
  zoomSpeed: number         // Multiplier for zoom gestures (default: 1)
  zoomSteps: number[]       // Discrete zoom levels
  wheelBehavior: 'zoom' | 'pan' | 'none'  // Mouse wheel action
  constraints?: TLCameraConstraints       // Bounds-based constraints
}
```

### TLCameraConstraints

**Location**: `/packages/editor/src/lib/editor/types/misc-types.ts:114-183`

Defines bounds-based camera constraints for applications like document viewers:

```typescript
export interface TLCameraConstraints {
  /** Bounds in page space for the constrained area */
  bounds: BoxModel

  /** Padding inside viewport (in screen pixels at 100% zoom) */
  padding: VecLike

  /** Origin for placement when axis is fixed/contained */
  origin: VecLike

  /** Initial zoom behavior */
  initialZoom: 'default' | 'fit-x' | 'fit-y' | 'fit-min' | 'fit-max' | 'fit-x-100' | 'fit-y-100'

  /** Base zoom for zoom steps calculation */
  baseZoom: 'default' | 'fit-x' | 'fit-y' | 'fit-min' | 'fit-max'

  /** Behavior per axis */
  behavior: 'free' | 'fixed' | 'inside' | 'outside' | 'contain' | {
    x: 'free' | 'fixed' | 'inside' | 'outside' | 'contain'
    y: 'free' | 'fixed' | 'inside' | 'outside' | 'contain'
  }
}
```

**Behavior options**:
- **free**: No constraint on this axis
- **fixed**: Bounds locked to origin position
- **contain**: Bounds stay completely within viewport
- **inside**: Viewport stays completely within bounds
- **outside**: Bounds touch at least one edge

### getConstrainedCamera(point, opts)

**Location**: `/packages/editor/src/lib/editor/Editor.ts:2925-3030`

Applies constraints to a proposed camera position:

```typescript
private getConstrainedCamera(
  point: VecLike,
  opts?: TLCameraMoveOptions
): { x: number; y: number; z: number } {
  const currentCamera = this.getCamera()
  let { x, y, z = currentCamera.z } = point

  if (!opts?.force) {
    const cameraOptions = this.getCameraOptions()
    const zoomMin = cameraOptions.zoomSteps[0]
    const zoomMax = last(cameraOptions.zoomSteps)!

    if (cameraOptions.constraints) {
      const { constraints } = cameraOptions
      const bounds = Box.From(constraints.bounds)
      const vsb = this.getViewportScreenBounds()

      // Clamp padding to half viewport
      const px = Math.min(constraints.padding.x, vsb.w / 2)
      const py = Math.min(constraints.padding.y, vsb.h / 2)

      // Calculate natural zoom (fit bounds with padding)
      const zx = (vsb.w - px * 2) / bounds.w
      const zy = (vsb.h - py * 2) / bounds.h

      const baseZoom = this.getBaseZoom()
      const maxZ = zoomMax * baseZoom
      const minZ = zoomMin * baseZoom

      // Clamp zoom
      z = clamp(z, minZ, maxZ)

      // Calculate position constraints based on behavior
      const minX = px / z - bounds.x
      const maxX = minX + (vsb.w - px * 2) / z - bounds.w

      // Apply behavior-specific clamping...
    }
  }

  return { x, y, z }
}
```

## Reactive Camera State

### getCamera()

**Location**: `/packages/editor/src/lib/editor/Editor.ts:2667-2676`

```typescript
@computed getCamera(): TLCamera {
  const baseCamera = this.store.get(this._unsafe_getCameraId())!
  if (this._isLockedOnFollowingUser.get()) {
    const followingCamera = this.getCameraForFollowing()
    if (followingCamera) {
      return { ...baseCamera, ...followingCamera }
    }
  }
  return baseCamera
}
```

Uses `@computed` decorator for reactive updates. When camera changes, all dependent computed values automatically recompute:
- `getZoomLevel()`
- `getViewportPageBounds()`
- Shape visibility
- DOM overlay positions

### getZoomLevel()

**Location**: `/packages/editor/src/lib/editor/Editor.ts:2736-2738`

```typescript
@computed getZoomLevel() {
  return this.getCamera().z
}
```

### getDebouncedZoomLevel()

**Location**: `/packages/editor/src/lib/editor/Editor.ts:2752-2762`

For performance optimization during zoom animations:

```typescript
@computed getDebouncedZoomLevel() {
  if (this.options.debouncedZoom) {
    if (this.getCameraState() === 'idle') {
      return this.getZoomLevel()
    } else {
      return this._debouncedZoomLevel.get()  // Cached zoom from animation start
    }
  }
  return this.getZoomLevel()
}
```

**Use case**: With many shapes (>300), recalculating everything during smooth zoom animations can cause jank. `debouncedZoom` keeps the zoom level constant during the animation, only updating when animation completes.

### getCameraState()

**Location**: `/packages/editor/src/lib/editor/Editor.ts:4205-4207`

```typescript
getCameraState() {
  return this._cameraState.get()  // 'idle' | 'moving'
}
```

Set to 'moving' when camera changes, reverts to 'idle' after `cameraMovingTimeoutMs` (default 64ms).

## Gesture and Input Handling

### Pinch Zoom (Two-Finger)

**Location**: `/packages/editor/src/lib/hooks/useGestureEvents.ts:82-240`

```typescript
let pinchState = 'not sure' as 'not sure' | 'zooming' | 'panning'
let initZoom = 1  // Browser's zoom level when pinch starts

// Determine intent based on finger distance change
if (Math.abs(offset[0]) > 0.05) {  // 5% change threshold
  pinchState = 'zooming'
}

case 'zooming': {
  // Exponential zoom scaling
  const currZoom = offset[0] ** editor.getCameraOptions().zoomSpeed
  const newZoom = initZoom * currZoom
  editor.setCamera({ ...camera, z: newZoom }, { force: true })
}
```

### Two-Finger Pan

**Location**: `/packages/editor/src/lib/hooks/useGestureEvents.ts:256-280`

```typescript
case 'panning': {
  const panOffset = Vec.Mul(offset[1], editor.getCameraOptions().panSpeed)
  editor.setCamera({
    x: camera.x - panOffset.x / camera.z,
    y: camera.y - panOffset.y / camera.z,
    z: camera.z
  }, { force: true })
}
```

**Note**: Pan offset is divided by zoom so panning feels consistent at different zoom levels.

### Wheel/Trackpad Zoom

**Location**: `/packages/editor/src/lib/hooks/useGestureEvents.ts:312-320`

```typescript
const { zoomSpeed } = editor.getCameraOptions()
const level = editor.getZoomLevel() ** (1 / zoomSpeed)

// Exponential scaling for smooth feel
const scale = offset[0] ** zoomSpeed
const newZoom = level * scale
editor.setCamera({ ...camera, z: newZoom })
```

The exponential math (`** zoomSpeed`) creates a logarithmic feel where each wheel tick changes zoom by a consistent percentage rather than absolute amount.

## Camera Animation

### Animation State

**Location**: `/packages/editor/src/lib/editor/Editor.ts:3494-3500`

```typescript
private _viewportAnimation = null as null | {
  elapsed: number
  duration: number
  easing(t: number): number
  start: Box   // Starting viewport bounds
  end: Box     // Target viewport bounds
}
```

### Per-Frame Animation Loop

**Location**: `/packages/editor/src/lib/editor/Editor.ts:3503-3527`

```typescript
_animateViewport(ms: number) {
  const { _viewportAnimation } = this
  if (!_viewportAnimation) return

  const { elapsed, duration, easing, start, end } = _viewportAnimation
  _viewportAnimation.elapsed = elapsed + ms

  if (elapsed > duration) {
    // Animation complete
    this._setCamera(new Vec(-end.x, -end.y, width / end.width))
    this._viewportAnimation = null
    return
  }

  const remaining = duration - elapsed
  const t = easing(1 - remaining / duration)  // Progress 0 to 1

  // Linear interpolation of viewport bounds
  const left = start.minX + (end.minX - start.minX) * t
  const top = start.minY + (end.minY - start.minY) * t
  const right = start.maxX + (end.maxX - start.maxX) * t

  this._setCamera(new Vec(-left, -top, width / (right - left)), { force: true })
}
```

**Key insight**: Animation interpolates viewport bounds, not camera values directly. This ensures smooth visual transitions since the viewport is what the user sees.

### Default Easing

**Location**: `/packages/editor/src/lib/constants.ts:16`

```typescript
easing: EASINGS.easeInOutCubic
```

Cubic ease-in-out provides smooth acceleration and deceleration.

## Shape-Space Transformations

Shapes exist in their own local coordinate space and are transformed to page space via transformation matrices.

### Transformation Hierarchy

```
Shape Local Space → Page Space → Screen Space
```

### getShapePageTransform(shape)

Returns the transformation matrix that converts shape-local coordinates to page coordinates. This matrix composes:
- Shape position (x, y)
- Shape rotation
- Parent transforms (for nested shapes)

### getPointInShapeSpace(shape, point)

**Location**: `/packages/editor/src/lib/editor/Editor.ts:5472-5475`

```typescript
getPointInShapeSpace(shape: TLShape | TLShapeId, point: VecLike): Vec {
  const id = typeof shape === 'string' ? shape : shape.id
  return this._getShapePageTransformCache().get(id)!.clone().invert().applyToPoint(point)
}
```

Converts a page-space point to shape-local space by applying the inverse of the shape's page transform.

### getShapePageBounds(shape)

**Location**: `/packages/editor/src/lib/editor/Editor.ts:4838-4847`

```typescript
getShapePageBounds(shape: TLShape | TLShapeId): Box | undefined {
  const pageTransform = this.getShapePageTransform(shape)
  if (!pageTransform) return undefined

  return Box.FromPoints(
    pageTransform.applyToPoints(this.getShapeGeometry(shape).boundsVertices)
  )
}
```

Transforms shape's local bounds vertices to page space, then computes the axis-aligned bounding box. This correctly handles rotated shapes.

## Key Formulas Summary

### Screen to Page

```
pageX = (screenX - screenBounds.x) / zoom - cameraPanX
pageY = (screenY - screenBounds.y) / zoom - cameraPanY
```

### Page to Screen

```
screenX = (pageX + cameraPanX) * zoom + screenBounds.x
screenY = (pageY + cameraPanY) * zoom + screenBounds.y
```

### Viewport Page Bounds

```
x: -cameraPanX
y: -cameraPanY
width: screenBounds.width / zoom
height: screenBounds.height / zoom
```

### Zoom to Fit Bounds

```
paddedInset = min(zoomToFitPadding, viewportWidth * 0.28)
requiredZoom = min(
  (viewportWidth - paddedInset) / boundsWidth,
  (viewportHeight - paddedInset) / boundsHeight
)
zoom = clamp(requiredZoom, minZoom, maxZoom)

cameraPanX = -boundsX + (viewportWidth - boundsWidth * zoom) / (2 * zoom)
cameraPanY = -boundsY + (viewportHeight - boundsHeight * zoom) / (2 * zoom)
```

## Performance Considerations

### Reactive Caching

All camera-dependent values use `@computed` decorators:
- Values only recompute when dependencies change
- Automatic dependency tracking prevents unnecessary updates
- Fine-grained invalidation (changing x doesn't recompute things that only depend on z)

### Debounced Zoom

For documents with many shapes:
- `debouncedZoom` option keeps zoom constant during animations
- Shapes render at cached zoom level during animation
- Full re-render only after animation completes (idle state)

### Viewport Culling

Shapes outside `getViewportPageBounds()` are excluded from rendering:
- Simple AABB collision test
- Computed reactively, updates when camera changes
- `canCull` flag on shapes opts them out if needed

## Summary of Key Insights

1. **Simple camera model**: Just x, y, z where z is zoom multiplier
2. **Three coordinate spaces**: Screen (browser), Page (canvas), Viewport (container-relative)
3. **Inverse relationships**: Screen pixels / zoom = page units; higher zoom = smaller viewport in page space
4. **Viewport bounds are key**: Everything derives from the visible page area
5. **Constraint system**: Flexible behavior options for document viewers, presentations
6. **Animation interpolates bounds**: Smooth visual transitions by lerping viewport, not camera
7. **Exponential zoom feel**: Gesture handlers use power functions for natural scrolling
8. **Reactive architecture**: Camera changes automatically propagate to all dependent values
9. **Performance optimizations**: Debounced zoom, viewport culling, fine-grained reactivity
10. **Transformation hierarchy**: Shapes → Page → Screen with matrix composition
