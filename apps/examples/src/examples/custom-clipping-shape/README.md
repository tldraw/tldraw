---
title: Custom Clipping Shape
component: ./CustomClippingExample.tsx
category: editor-api
priority: 1
keywords: [clipping, shape]
---

# Custom Clipping Shape Example

This example demonstrates the extensible clipping system in tldraw, showing how to create custom shapes that can clip their children with any polygon geometry.

## Features

- **Circle Clipping Shape**: A custom shape that clips its children to a circular boundary
- **Toggle Clipping**: Enable/disable clipping on individual shapes
- **Selective Clipping**: Option to only clip specific shape types (e.g., text-only mode)
- **Visual Feedback**: Different visual styles to indicate clipping state

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

- **Custom Geometry**: Uses a polygon approximation of a circle for clipping
- **Conditional Clipping**: Can be enabled/disabled via shape properties
- **Selective Clipping**: Optional "text-only" mode that only clips text shapes
- **Visual Indicators**: Different appearance based on clipping state

### Advanced Features

- **Dynamic Clipping**: Clip path can change based on shape properties
- **Smart Child Filtering**: `shouldClipChild()` can inspect child properties
- **Smooth Circular Clipping**: Uses 32-segment polygon for smooth circular boundaries

## Usage

1. Use the **Circle Clip Tool** (circle icon) in the toolbar to create circular clipping shapes
2. Click the **"✂️ Toggle Clipping"** button in the top-left to enable/disable clipping for all circle shapes globally
3. The example starts with demo content already clipped by a circular shape

## Key Features

- **Toolbar Integration**: Circle clip tool appears in the main tldraw toolbar
- **Global Toggle**: One button controls clipping for all circle shapes at once
- **Visual Feedback**: Circle shapes change appearance when clipping is enabled/disabled
- **Auto Demo Content**: Example starts with clipped content to demonstrate the feature

## Technical Notes

- Clip paths are defined in the shape's local coordinate system
- The Editor automatically transforms them to page space for rendering
- Multiple clipping ancestors are supported (intersected together)
- Performance is optimized through computed caching
