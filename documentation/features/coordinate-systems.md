---
title: Coordinate systems
created_at: 12/20/2024
updated_at: 12/20/2024
keywords:
  - coordinates
  - screen
  - page
  - viewport
  - transform
reviewed_by: steveruizok
---

The editor operates across three distinct coordinate systems to map between user input, the canvas viewport, and the infinite space of the canvas. These coordinate systems enable the editor to accurately translate mouse positions into canvas locations, position shapes correctly at any zoom level, and render content within the visible viewport.

Understanding these coordinate systems is essential when working with user input, custom tools, or programmatic shape manipulation. The camera system bridges these spaces through transformation methods that account for viewport position, zoom level, and the container's placement on the website's document.

## The three coordinate systems

The editor uses three coordinate systems, each serving a specific purpose in the rendering and interaction pipeline.

### Screen space

Screen space represents absolute pixel coordinates from the browser document's origin at the top-left corner of the browser window. This includes any space outside the editor container, such as browser chrome, toolbars, or other page content. Screen coordinates match the values returned by browser events like `MouseEvent.clientX` and `MouseEvent.clientY`.

When processing mouse or touch input, coordinates arrive in screen space and must be transformed into page space to determine which shapes the user is interacting with.

### Viewport space

Viewport space represents pixel coordinates from the canvas container's origin. The viewport is the visible rendering area of the editor, excluding any UI elements outside the canvas. Viewport coordinates account for the container's position on the page, which may change if the editor is embedded within a scrollable or repositioned element.

The editor stores the viewport's position and dimensions in the instance state's `screenBounds` property, which tracks the container's location in screen space.

### Page space

Page space represents coordinates on the infinite canvas itself, independent of camera position or zoom level. A shape at `x: 100, y: 200` in page space maintains those coordinates regardless of how the user pans or zooms the viewport. Page space is the canonical coordinate system for shape positions, and all shape geometries are defined in page coordinates.

The camera controls which portion of page space is visible within the viewport. As users pan and zoom, the camera transforms page coordinates into viewport coordinates for rendering.

## Coordinate transformations

The editor provides transformation methods to convert between coordinate systems. These methods account for both camera position and zoom level.

### Screen to page space

The editor's `screenToPage()` method converts screen coordinates to page coordinates:

```typescript
// Convert mouse event coordinates to page space
const pagePoint = editor.screenToPage({ x: event.clientX, y: event.clientY })

// Create a shape at the clicked location
editor.createShape({
	type: 'geo',
	x: pagePoint.x,
	y: pagePoint.y,
	props: { w: 100, h: 100, geo: 'rectangle' },
})
```

This method subtracts the viewport's screen position, scales by the inverse of the zoom level, and subtracts the camera's page position. Use this whenever you need to map user input to canvas coordinates.

### Page to screen space

The `pageToScreen()` method converts page coordinates to screen coordinates:

```typescript
// Convert shape position to screen coordinates
const shape = editor.getShape(shapeId)
const screenPoint = editor.pageToScreen({ x: shape.x, y: shape.y })

// Position a DOM element at the shape's screen location
element.style.left = `${screenPoint.x}px`
element.style.top = `${screenPoint.y}px`
```

This method adds the camera's page position, multiplies by the zoom level, and adds the viewport's screen position. Use this when positioning DOM elements or overlays relative to shapes.

### Page to viewport space

The `pageToViewport()` method converts page coordinates to viewport coordinates:

```typescript
// Get viewport coordinates for a page point
const viewportPoint = editor.pageToViewport({ x: 500, y: 300 })

// Check if a point is visible in the viewport
const viewportBounds = editor.getViewportScreenBounds()
const isVisible =
	viewportPoint.x >= 0 &&
	viewportPoint.x <= viewportBounds.w &&
	viewportPoint.y >= 0 &&
	viewportPoint.y <= viewportBounds.h
```

This transformation is similar to `pageToScreen()` but returns coordinates relative to the viewport's origin rather than the document's origin. Use this when working with canvas rendering contexts or when the viewport's screen position is not relevant.

## Working with viewport bounds

The editor provides methods to query viewport bounds in both screen and page space.

The `getViewportScreenBounds()` method returns the viewport's position and dimensions in screen space:

```typescript
const screenBounds = editor.getViewportScreenBounds()
// screenBounds.x, screenBounds.y - viewport position in screen space
// screenBounds.w, screenBounds.h - viewport dimensions in pixels
```

The `getViewportPageBounds()` method returns the visible area in page space:

```typescript
const pageBounds = editor.getViewportPageBounds()
// pageBounds.x, pageBounds.y - top-left corner of viewport in page space
// pageBounds.w, pageBounds.h - viewport dimensions in page units
```

These bounds are useful for culling off-screen shapes during rendering, determining which content is visible, or calculating positions relative to the viewport.

## Common use cases

### Processing mouse input

Convert mouse events to page coordinates before creating or manipulating shapes:

```typescript
editor.on('pointer-down', (event) => {
	const pagePoint = editor.screenToPage({ x: event.clientX, y: event.clientY })
	// Use pagePoint for shape manipulation
})
```

### Positioning custom overlays

Map shape positions to screen space when positioning DOM elements:

```typescript
const shape = editor.getShape(shapeId)
const screenPoint = editor.pageToScreen({ x: shape.x, y: shape.y })
overlay.style.left = `${screenPoint.x}px`
overlay.style.top = `${screenPoint.y}px`
```

## Key files

- packages/editor/src/lib/editor/Editor.ts - Coordinate transformation methods (screenToPage, pageToScreen, pageToViewport, getViewportScreenBounds, getViewportPageBounds)
- packages/editor/src/lib/primitives/Mat.ts - Matrix transformations
- packages/editor/src/lib/primitives/Vec.ts - Vector operations and point transformations
- packages/editor/src/lib/primitives/Box.ts - Bounding box utilities

## Related

- [Camera system](./camera-system.md)
- [Input handling](./input-handling.md)
