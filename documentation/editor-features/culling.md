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
---

## Overview

The culling system optimizes rendering performance by identifying shapes that are outside the viewport and preventing them from being rendered. Rather than calculating every shape's visual representation on every frame, the culling system determines which shapes the user cannot see and sets their display property to `none`. Culled shapes remain in the DOM but incur no rendering cost. The system uses incremental derivations to efficiently track visibility changes as the camera moves or shapes are modified, ensuring that performance remains consistent even with thousands of shapes on the canvas.

## How it works

The culling system operates through a two-layer approach that balances performance with user experience.

The first layer, exposed through `editor.getNotVisibleShapes()`, identifies all shapes whose page bounds fall completely outside the viewport's page bounds. This calculation runs through every shape on the current page, checking whether each shape's bounding box intersects with the visible area. Shapes are evaluated against the viewport using a simple bounds comparison, which is fast enough to run reactively. The system intentionally skips mask calculations during this check because the computational overhead of precise mask geometry outweighs the benefit of more accurate culling.

The second layer, exposed through `editor.getCulledShapes()`, refines the not-visible set by removing shapes that should remain visible despite being outside the viewport. Specifically, it excludes any selected shapes and the currently editing shape. This ensures that users can always see what they're working with, even if they've scrolled it partially or fully out of view. For example, if you select a shape and then pan the canvas so the shape moves off-screen, the shape continues to render because it's selected.

### Incremental derivation

The culling system uses tldraw's reactive state system to minimize unnecessary recalculations. The `notVisibleShapes` derivation is implemented as a computed value that tracks changes to the viewport bounds and shape positions. When the computed value updates, it compares the new set of not-visible shapes with the previous set. If the sets are identical in size and content, the previous set is returned unchanged, which prevents downstream reactions from triggering unnecessarily.

This incremental approach means that panning the camera slightly might only change culling status for shapes near the viewport edge, rather than recalculating visibility for the entire page. The system automatically tracks dependencies through the reactive state library, so changes to shape positions, viewport bounds, or the current page trigger recomputation only when necessary.

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

### Rendering behavior

The culling system integrates with shape rendering through a `useQuickReactor` hook in the Shape component. This hook monitors the `getCulledShapes` computed value and sets the CSS `display` property to `none` when a shape becomes culled, or `block` when it becomes visible again. Because culled shapes remain in the DOM, there's no expensive mount/unmount cycle when shapes move in and out of view. The browser simply skips rendering them, which provides the performance benefit of culling without the cost of reconstructing the React component tree.

The `getCurrentPageRenderingShapesSorted` method on the editor filters out culled shapes entirely, so components that iterate over "visible shapes" automatically respect the culling system without additional logic.

## Key concepts

**Viewport page bounds** are the bounds of the visible area expressed in page coordinates. As the camera pans and zooms, these bounds change, which triggers recalculation of not-visible shapes. The viewport bounds are themselves a computed value, so the culling derivation automatically subscribes to them through the reactive state system.

**Page bounds** are the axis-aligned bounding boxes of shapes in page coordinate space. The culling system uses page bounds rather than screen bounds because page coordinates remain stable as the camera moves. This allows the culling calculation to focus on the relationship between shapes and the viewport without needing to account for the camera transform.

**Incremental computation** means calculating only what changed rather than recalculating everything from scratch. The culling system leverages this pattern by comparing the new not-visible set with the previous one and returning the previous set when nothing changed. This prevents unnecessary updates to components that depend on culling state.

**Selection exclusion** ensures selected shapes remain visible even when outside the viewport. This is a usability feature that allows users to see selection indicators and manipulate shapes without needing to pan them back into view first. The editing shape receives the same treatment, allowing users to continue editing text or other shape content even if they've scrolled it partially off-screen.

## Key files

- packages/editor/src/lib/editor/derivations/notVisibleShapes.ts - Incremental derivation of not-visible shapes
- packages/editor/src/lib/editor/Editor.ts - getCulledShapes and getNotVisibleShapes methods
- packages/editor/src/lib/editor/shapes/ShapeUtil.ts - canCull method definition
- packages/editor/src/lib/components/Shape.tsx - Rendering integration with culling system

## Related

- [Camera system](./camera-system.md)
- [Rendering shapes](../architecture/rendering-shapes.md)
