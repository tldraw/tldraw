---
title: Culling
created_at: 12/20/2024
updated_at: 12/20/2024
keywords:
  - culling
  - visibility
  - viewport
  - performance
  - rendering
status: published
date: 12/20/2024
order: 8
---

The culling system optimizes rendering performance by identifying shapes that are outside the viewport and preventing them from being rendered.

In the React canvas, culled shapes remain in the DOM but have their `display` property set to `none` and so incur no rendering cost. The system uses incremental derivations to efficiently track visibility changes as the camera moves or shapes are modified, ensuring that performance remains consistent even with thousands of shapes on the canvas.

## How it works

The culling system operates through a two-layer approach that balances performance with user experience.

The first layer, exposed through `editor.getNotVisibleShapes()`, identifies all shapes whose page bounds fall completely outside the viewport's page bounds. This calculation runs through every shape on the current page, checking whether each shape's bounding box intersects with the visible area. Shapes are evaluated against the viewport using a simple bounds comparison, which is fast enough to run reactively.

> The system intentionally skips mask calculations during this check because the computational overhead of precise mask geometry outweighs the benefit of more accurate culling.

The second layer, exposed through `editor.getCulledShapes()`, refines the not-visible set by removing shapes that should remain visible despite being outside the viewport. Specifically, it excludes any selected shapes and the currently editing shape. This ensures that users can always see what they're working with, even if they've scrolled it partially or fully out of view, and so that certain stateful DOM elements remain rendered and interactive.

### Shape-level control

Each shape type can opt out of culling by overriding the `canCull` method on its ShapeUtil class. By default, `canCull` returns `true`, which means most shapes participate in the culling system. However, shapes with visual effects that extend beyond their bounds or shapes that need to remain visible for other reasons can return `false` to bypass culling entirely.

```typescript
class MyShapeUtil extends ShapeUtil<MyShape> {
	canCull(shape: MyShape): boolean {
		// Shapes with glow effects shouldn't be culled because
		// the glow might be visible even when the shape isn't
		if (shape.props.hasGlow) {
			return false
		}
		return true
	}
}
```

When `canCull` returns `false` for a shape, the culling system skips that shape entirely during visibility checks, treating it as always visible regardless of its position relative to the viewport.
