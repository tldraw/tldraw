---
title: Custom shape with tldraw styles
component: ./ShapeWithTldrawStylesExample.tsx
priority: 1.5
keywords:
  [
    default styles,
    defaultsizestyle,
    defaultcolorstyle,
    style panel,
    getcurrenttheme,
    getcolorvalue,
    shapeutil,
  ]
---

Use tldraw's built-in size and color styles as props on a custom shape.

---

The default style panel shows the styles shared by your selection or current tool. If all selected shapes have the same value for a style, that value is shown as selected; otherwise the panel shows it as "mixed". You get this for free on custom shapes by using tldraw's `StyleProp`s (here `DefaultSizeStyle` and `DefaultColorStyle`) as prop validators.

Select the shape and change the size and color in the style panel. The shape reads the color from the current theme with `editor.getCurrentTheme()` and `getColorValue`, so it also follows dark mode.

To create your own custom styles, check the [custom styles example](https://tldraw.dev/examples/shape-with-custom-styles).
