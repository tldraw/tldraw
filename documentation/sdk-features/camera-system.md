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
status: published
date: 12/20/2024
order: 4
---

The camera system controls how users view and navigate the infinite canvas. It manages viewport position and zoom level, translating user interactions into smooth camera movements while transforming coordinates between screen space and page space. This coordinate transformation enables the editor to map mouse positions to canvas locations and render shapes at any zoom level.

The camera acts as the bridge between user input and canvas navigation, providing constraints for bounded experiences, smooth animations for programmatic movement, and zoom-to-fit operations for content focus. It integrates with collaboration features for real-time viewport following and serves as the foundation for all spatial interactions on the canvas.

## How it works

The camera represents the viewport's position and zoom using three values: `x` and `y` for position in page space, and `z` for zoom level. A zoom of `1` means 100%, `0.5` is 50%, and `2` is 200%. The camera's x and y coordinates represent the top-left corner of the viewport in page coordinates.

The camera transforms between two coordinate spaces:

- **Screen space** - Browser pixels from the document origin
- **Page space** - The infinite canvas coordinate system

The `screenToPage()` method converts mouse positions to canvas coordinates, while `pageToScreen()` converts canvas coordinates to screen positions:

```typescript
const pagePoint = editor.screenToPage({ x: event.clientX, y: event.clientY })
const screenPoint = editor.pageToScreen(shape.x, shape.y)
```

The camera responds to user input through mouse wheel, trackpad gestures, keyboard shortcuts, and touch events. The `wheelBehavior` option determines whether scrolling pans or zooms the viewport.

## Camera options

Camera behavior is configured through `TLCameraOptions`:

```typescript
editor.setCameraOptions({
	isLocked: false,
	wheelBehavior: 'pan',
	panSpeed: 1,
	zoomSpeed: 1,
	zoomSteps: [0.1, 0.25, 0.5, 1, 2, 4, 8],
})
```

The `isLocked` option prevents all camera movement, useful for fixed-viewport experiences.

The `wheelBehavior` option determines how mouse wheel or trackpad scroll affects the viewport: `'pan'` for navigating large diagrams, `'zoom'` for detail work, or `'none'` to disable wheel interaction.

The `panSpeed` and `zoomSpeed` multipliers adjust input sensitivity. Values below 1 slow down movement, values above 1 speed it up.

The `zoomSteps` array defines discrete zoom levels. The first value sets minimum zoom, the last sets maximum zoom, and intermediate values determine snap points for zoom controls.

## Camera constraints

Camera constraints limit where users can navigate. Use them for presentations, guided experiences, or applications with fixed content areas:

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

The `bounds` define the constrained area in page space. The camera restricts panning outside this rectangle based on the `behavior` setting.

The `padding` adds screen space margin inside the viewport, preventing content from touching the screen edges.

The `origin` determines how bounds are positioned within the viewport when using `'fixed'` behavior. Values of `{ x: 0.5, y: 0.5 }` center the bounds, while `{ x: 0, y: 0 }` aligns to the top-left.

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

The `initialZoom` sets the starting zoom when the camera resets. The `baseZoom` defines the reference point for zoom steps, affecting how zoom in/out operations scale relative to the viewport.

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

The editor provides methods for programmatic camera control. All methods accept optional animation parameters.

### Basic navigation

Move the camera to a specific position and zoom:

```typescript
editor.setCamera({ x: -500, y: -300, z: 1.5 })
```

Center the viewport on a point:

```typescript
editor.centerOnPoint({ x: 1000, y: 500 })
```

Zoom in or out:

```typescript
editor.zoomIn()
editor.zoomOut({ x: 200, y: 150 })
```

### Zoom to content

Focus the camera on shapes or bounds:

```typescript
editor.zoomToFit()
editor.zoomToSelection()

const bounds = { x: 0, y: 0, w: 1000, h: 800 }
editor.zoomToBounds(bounds, { inset: 100 })
```

### Animated movement

Add smooth transitions using the `animation` option:

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

Camera animations stop automatically when users pan or zoom, ensuring user input takes precedence over programmatic movement.

### Momentum scrolling

Create momentum-based camera movement:

```typescript
editor.slideCamera({
	speed: 2,
	direction: { x: 1, y: 0 },
	friction: 0.1,
})
```

The camera gradually decelerates based on the friction value. Higher friction stops movement faster. Use this for kinetic scrolling or to continue movement after gesture completion.

## Collaboration features

The camera system integrates with collaboration through user following. When following another user, the camera tracks their viewport position and zoom.

User following respects the follower's viewport size. If aspect ratios differ, the system adjusts zoom to keep the followed user's content visible while maintaining the follower's viewport dimensions.

See [User following](./user-following.md) for implementation details.

## Examples

- **[Camera options](https://github.com/tldraw/tldraw/tree/main/apps/examples/src/examples/camera-options)** - Configure the camera's options and constraints including zoom behavior, pan speed, and camera bounds.
- **[Image annotator](https://github.com/tldraw/tldraw/tree/main/apps/examples/src/examples/image-annotator)** - An image annotator that demonstrates how to configure camera options for fixed-viewport annotation apps.
- **[Slideshow (fixed camera)](https://github.com/tldraw/tldraw/tree/main/apps/examples/src/examples/slideshow)** - A simple slideshow app with a fixed camera using camera constraints.
- **[Lock camera zoom](https://github.com/tldraw/tldraw/tree/main/apps/examples/src/examples/lock-camera-zoom)** - Lock the camera at a specific zoom level using the camera controls API.
- **[Zoom to bounds](https://github.com/tldraw/tldraw/tree/main/apps/examples/src/examples/zoom-to-bounds)** - Programmatically zoom the camera to specific bounds using the editor's `zoomToBounds` method.
- **[Scrollable container](https://github.com/tldraw/tldraw/tree/main/apps/examples/src/examples/scroll)** - Use the editor inside a scrollable container with proper mousewheel event handling.
