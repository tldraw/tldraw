---
title: Geo shape display values
component: ./GeoShapeDisplayValuesExample.tsx
category: configuration
priority: 1
keywords: [geo, display, values, override, configure, colors, fonts, customize]
---

Override the display values used when rendering geo shapes.

---

The geo shape has a `getDisplayValueOverrides` option that lets you override the computed display values for any geo shape. Display values control visual properties like colors, fonts, sizing, and alignment.

Use `GeoShapeUtil.configure()` to provide a `getDisplayValueOverrides` function that returns partial overrides. These are merged on top of the default display values computed from the shape's props.
