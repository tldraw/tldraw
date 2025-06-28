---
title: Custom text outline
component: ./CustomTextOutlineExample.tsx
category: configuration
priority: 1
---

Disable text outlines on text and arrow labels.

---

This example shows how to configure the `ArrowShapeUtil` and `TextShapeUtil` to disable text outlines. By default, tldraw adds a text outline (using the canvas background color) to help text stand out when overlapping with other shapes. You can disable this feature by configuring the shape utilities.

This is particularly useful for:

- Performance optimization on certain browsers (we already skip on Safari)
- Different visual styling preferences
