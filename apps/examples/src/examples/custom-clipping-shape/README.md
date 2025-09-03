---
title: Custom Clipping Shape
component: ./CustomClippingExample.tsx
category: editor-api
priority: 1
keywords: [clipping, shape]
---

# Custom Clipping Shape Example

This example demonstrates the extensible clipping system in tldraw, showing how to create custom shapes that can clip their children with any polygon geometry.

## Key Implementation Details

### ShapeUtil Methods

The clipping system uses two methods in the `ShapeUtil` base class:

```typescript
// Returns the clip path polygon in local coordinates
getClipPath(shape: Shape): Vec[] | undefined

// Determines which children should be clipped
shouldClipChild(child: TLShape): boolean
```

### Circle Clip Shape

The `CircleClipShapeUtil` demonstrates:

- **Custom Geometry**: Uses a polygon approximation of a circle for clipping.
- **Conditional Clipping**: Can be enabled/disabled via shape properties or other state.
- **Selective Clipping**: Text shapes can be selectively excluded from clipping via override.
- **Visual Indicators**: Different appearance based on clipping state.

## Usage

1. Use the **Circle Clip Tool** (circle icon) in the toolbar to create circular clipping shapes
2. Click the **"✂️ Toggle Clipping"** button in the top-left to enable/disable clipping for all circle shapes globally
3. Click the **"📝 Text Clipping Override"** button to toggle whether text shapes should be clipped (when override is ON, text shapes are not clipped regardless of global setting)
4. The example starts with demo content already clipped by a circular shape

## Technical Notes

- Clip paths are defined in the shape's local coordinate system
- The Editor automatically transforms them to page space for rendering
- Multiple clipping ancestors are supported (intersected together)
- Performance is optimized through computed caching
- The `shouldClipChild` method can be used to selectively exclude certain shapes from clipping if needed.
