---
title: Display options
component: ./DisplayOptionsExample.tsx
category: configuration
priority: 1
keywords: [display, values, override, configure, colors, fonts, customize]
---

Override the display values used when rendering shapes.

---

Shape utils have a `getDisplayValueOverrides` option that lets you override the computed display values for any shape. Display values control visual properties like colors, fonts, sizing, and alignment.

Use `ShapeUtil.configure()` to provide a `getDisplayValueOverrides` function that returns partial overrides. These are merged on top of the default display values computed from the shape's props.
