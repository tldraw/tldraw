---
title: Stroke size picker
component: ./StrokeSizePickerExample.tsx
priority: 3.5
keywords: [stroke, size, picker, pen, draw, style panel, styleprop, custom styles]
---

Give the draw tool twelve stroke sizes instead of four.

---

The draw tool's built-in size style has only four values (s, m, l, xl). This example gives draw shapes a numeric stroke size style defined with `StyleProp.define`, wires it into the draw shape's stroke width with `DrawShapeUtil.configure`, and composes a custom style panel that swaps the built-in size picker for a twelve-option preset picker. The picker only appears when the draw tool is active or draw shapes are selected; every other shape keeps the default size picker.

To use a custom style with a custom shape instead, check the [custom shape with custom styles example](https://tldraw.dev/examples/shape-with-custom-styles).
