---
title: Camera system
created_at: 12/20/2024
updated_at: 12/20/2024
keywords:
  - camera
  - zoom
  - pan
  - viewport
  - constraints
  - animation
---

## Overview

The camera system controls how users view and navigate the infinite canvas. It manages the viewport's position and zoom level, translating user interactions like scrolling, pinching, and clicking into smooth camera movements. The camera transforms coordinates between screen space and page space, enabling the editor to map mouse positions to canvas locations and render shapes correctly at any zoom level.

Beyond basic navigation, the camera system provides constraints to limit where users can pan and zoom, smooth animations for programmatic camera movements, and zoom-to-fit functionality for focusing on specific content. The system integrates with collaboration features to allow users to follow each other's viewports in real-time.

## How it works

The camera represents the viewport's position and zoom using three values: `x` and `y` for position in page space, and `z` for zoom level. A zoom of `1` means 100%, `0.5` is 50%, and `2` is 200%. The camera's x and y coordinates represent the top-left corner of the viewport in page coordinates.

The camera system transforms between coordinate spaces:

- **Screen space**: Browser pixels from the document origin
- **Page space**: The infinite canvas coordinate system

The `screenToPage()` method converts mouse positions to canvas coordinates, while `pageToScreen()` converts canvas coordinates to screen positions. These transformations account for both camera position and zoom:

```typescript
// Convert mouse click to canvas coordinates
const pagePoint = editor.screenToPage({ x: event.clientX, y: event.clientY })

// Convert shape position to screen coordinates for rendering
const screenPoint = editor.pageToScreen(shape.x, shape.y)
```

The camera responds to user input through mouse wheel, trackpad gestures, keyboard shortcuts, and touch events. The `wheelBehavior` option controls whether scrolling pans or zooms the viewport.

## Camera options

Camera behavior is configured through `TLCameraOptions`, which control input sensitivity, zoom levels, and viewport locking:

```typescript
editor.setCameraOptions({
  isLocked: false,
  wheelBehavior: 'pan',
  panSpeed: 1,
  zoomSpeed: 1,
  zoomSteps: [0.1, 0.25, 0.5, 1, 2, 4, 8],
})
```

The `isLocked` option prevents all camera movement. Use this to create fixed-viewport experiences where users cannot pan or zoom.

The `wheelBehavior` option determines how the mouse wheel or trackpad scroll affects the viewport. Set to `'pan'` for navigating large diagrams, `'zoom'` for detail work, or `'none'` to disable wheel interaction entirely.

Pan and zoom speed multipliers adjust input sensitivity. Values below 1 slow down movement, while values above 1 speed it up. This helps accommodate different input devices and user preferences.

The `zoomSteps` array defines discrete zoom levels for zoom in/out operations. The first value sets the minimum zoom, the last value sets the maximum zoom, and intermediate values determine where the zoom snaps when using zoom controls.

## Camera constraints

Camera constraints limit where users can navigate, useful for presentations, guided experiences, or applications with fixed content areas. Constraints are defined through the `constraints` property in camera options:

```typescript
editor.setCameraOptions({
  constraints: {
    bounds: { x: 0, y: 0, w: 1920, h: 1080 },
    padding: { x: 50, y: 50 },
    origin: { x: 0.5, y: 0.5 },
    initialZoom: 'fit-min',
    baseZoom: 'default',
    behavior: 'inside',
  },
})
```

The `bounds` define the constrained area in page space. The camera will not pan outside this rectangle based on the `behavior` setting.

The `padding` adds screen space margin inside the viewport. This prevents content from being positioned at the exact edge of the screen.

The `origin` determines how bounds are positioned within the viewport when using `'fixed'` behavior. A value of `{ x: 0.5, y: 0.5 }` centers the bounds, while `{ x: 0, y: 0 }` aligns to the top-left.

### Zoom fitting

The `initialZoom` and `baseZoom` options control how content fits the viewport:

- `'default'`: 100% zoom, showing content at actual size
- `'fit-min'`: Fit the smaller axis, ensuring all bounds are visible
- `'fit-max'`: Fit the larger axis, potentially cropping content
- `'fit-x'`: Fit horizontally, filling the viewport width
- `'fit-y'`: Fit vertically, filling the viewport height
- `'fit-x-100'`: Fit horizontally or use 100%, whichever is smaller
- `'fit-y-100'`: Fit vertically or use 100%, whichever is smaller
- `'fit-min-100'`: Fit the smaller axis or use 100%, whichever is smaller
- `'fit-max-100'`: Fit the larger axis or use 100%, whichever is smaller

The `initialZoom` determines the starting zoom when the camera is reset. The `baseZoom` defines the reference point for zoom steps, affecting how zoom in/out operations scale relative to the viewport.

### Constraint behaviors

The `behavior` option controls how bounds constrain camera movement:

- `'free'`: Bounds are ignored, allowing unlimited panning
- `'fixed'`: Bounds are positioned at the origin regardless of pan attempts
- `'inside'`: Bounds must stay completely within the viewport
- `'outside'`: Bounds must stay touching the viewport edges
- `'contain'`: Uses `'fixed'` when zoomed out and `'inside'` when zoomed in

Set behavior per axis for asymmetric constraints:

```typescript
behavior: {
  x: 'free',    // Horizontal panning unrestricted
  y: 'inside',  // Vertical panning keeps bounds visible
}
```

## Camera methods

The editor provides methods for programmatic camera control. All methods accept optional animation parameters for smooth transitions.

### Basic navigation

Move the camera to a specific position and zoom:

```typescript
editor.setCamera({ x: -500, y: -300, z: 1.5 })
```

Center the viewport on a point:

```typescript
editor.centerOnPoint({ x: 1000, y: 500 })
```

Zoom in or out from a point:

```typescript
// Zoom in at viewport center
editor.zoomIn()

// Zoom out at a specific point
editor.zoomOut({ x: 200, y: 150 })
```

### Zoom to content

Focus the camera on specific shapes or bounds:

```typescript
// Zoom to fit all shapes on the current page
editor.zoomToFit()

// Zoom to fit specific shapes
editor.zoomToSelection()

// Zoom to custom bounds with padding
const bounds = { x: 0, y: 0, w: 1000, h: 800 }
editor.zoomToBounds(bounds, { inset: 100 })
```

### Animated movement

Add smooth transitions to camera movements using the `animation` option:

```typescript
editor.setCamera(
  { x: 0, y: 0, z: 1 },
  {
    animation: {
      duration: 500,
      easing: EASINGS.easeInOutCubic,
    },
  }
)
```

Camera animations automatically stop when users interact with the viewport through panning or zooming. This ensures user input always takes precedence over programmatic animations.

### Momentum scrolling

Create smooth momentum-based camera movement:

```typescript
editor.slideCamera({
  speed: 2,
  direction: { x: 1, y: 0 },
  friction: 0.1,
})
```

The slide gradually decelerates based on the friction value. Higher friction stops the movement faster. Use this for kinetic scrolling effects or to continue movement after a gesture ends.

## Collaboration features

The camera system integrates with collaboration features through user following. When following another user, the camera tracks their viewport position and zoom, creating a shared viewing experience.

User following respects the follower's viewport size. If the followed user has a different aspect ratio, the system adjusts zoom to keep their content visible while maintaining the follower's viewport dimensions.

See the [user following documentation](./user-following.md) for implementation details.

## Key files

- packages/editor/src/lib/editor/Editor.ts - Camera methods (setCamera, zoomIn, zoomOut, centerOnPoint, zoomToFit, zoomToBounds, slideCamera)
- packages/editor/src/lib/constants.ts - DEFAULT_CAMERA_OPTIONS
- packages/editor/src/lib/editor/types/misc-types.ts - TLCameraOptions, TLCameraMoveOptions, TLCameraConstraints

## Related

- [Coordinate systems](./coordinate-systems.md)
- [Animation](./animation.md)
- [User following](./user-following.md)
- [Input handling](./input-handling.md)
