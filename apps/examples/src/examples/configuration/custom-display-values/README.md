---
title: Custom display values
component: ./CustomDisplayValuesExample.tsx
priority: 1
keywords:
  [
    display values,
    configure,
    shapeutil,
    border,
    stroke,
    font size,
    customization,
    styles,
    theme,
    per-shape,
    style panel,
  ]
---

Customize individual shape appearance with in-canvas controls — no custom shapes needed.

---

This example shows how to combine `ShapeUtil.configure()` with a custom style panel to give users per-shape control over visual properties that aren't exposed by default.

Two custom controls are added to the style panel (visible when geo or note shapes are selected):

1. **Border color picker** — A row of color swatches that sets `shape.meta.borderColor`. Includes a "None" option that removes borders entirely by setting `strokeWidth` to `0`.
2. **Label font size slider** — Maps slider steps to predefined pixel sizes (`12–48px`), stored in `shape.meta.labelFontSize`. A "Reset" button reverts to the theme default.

The configured shape utils read these meta values in `getCustomDisplayValues` to produce per-shape rendering overrides. Different shapes on the same canvas can have completely different border colors and font sizes simultaneously.

The custom style panel extends `DefaultStylePanel` rather than replacing it, so all built-in controls (color, fill, dash, size, font, etc.) remain available alongside the new ones.
