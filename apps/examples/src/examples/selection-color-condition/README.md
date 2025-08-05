---
title: Selection Color Condition
component: ./SelectionColorConditionExample.tsx
category: ui
priority: 3
keywords: [selection, color, condition, rectangle, geo shapes]
---

Change the selection color based on the types of shapes selected.

---

This example shows how to change the selection color when the selection contains only rectangle geo shapes. The selection will appear red when all selected shapes are rectangles, and use the default blue color otherwise.

The example uses the `react` function to listen for selection changes and updates the container's CSS class accordingly.

## How it works

1. **Listen for selection changes**: The `react` function is used to create a reactive effect that runs whenever the selection changes.

2. **Check shape conditions**: The code checks if all selected shapes match a specific condition (in this case, being rectangle geo shapes).

3. **Update CSS classes**: Based on the condition, the container's CSS class is added or removed.

4. **Style with CSS**: The CSS uses CSS custom properties to override the default selection colors.

## Customizing the condition

You can modify the condition to check for different shape types:

```typescript
// Check for circle shapes
const allAreCircles = selectedShapes.length > 0 && selectedShapes.every(shape => 
	shape.type === 'geo' && shape.props.geo === 'ellipse'
)

// Check for text shapes
const allAreText = selectedShapes.length > 0 && selectedShapes.every(shape => 
	shape.type === 'text'
)

// Check for mixed conditions
const hasRectanglesAndCircles = selectedShapes.length > 0 && selectedShapes.every(shape => 
	shape.type === 'geo' && (shape.props.geo === 'rectangle' || shape.props.geo === 'ellipse')
)
```