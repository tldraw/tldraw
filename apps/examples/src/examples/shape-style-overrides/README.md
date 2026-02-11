---
title: Shape style overrides
component: ./ShapeStyleOverridesExample.tsx
category: configuration
priority: 6
keywords: [styles, overrides, theme, color, stroke, fill]
---

Use `getShapeStyleOverrides` to customize how a specific color appears across all shapes.

---

The `getShapeStyleOverrides` prop lets you override the computed style values of any shape. This example replaces the default "red" and "light-red" colors with higher-chroma variants that are more vivid in light mode and brighter in dark mode.

Draw some shapes, set their color to red, and compare with other colors to see the difference. Toggle dark mode to see the themed values adapt automatically.
