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
