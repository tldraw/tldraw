---
title: Change default colors
component: ./ChangingDefaultColorsExample.tsx
priority: 0.5
keywords:
  [
    colors,
    colours,
    theme,
    palette,
    style panel,
    defaultcolorstyle,
    color values,
    theming,
    customization,
  ]
---

Change the values in tldraw's default color palette with `editor.updateTheme()`.

---

Get the current theme with `editor.getTheme()`, change the color values you want, and pass the result to `editor.updateTheme()`. Here the "black" color renders as aqua in light mode. Try drawing something with the default color to see the change.

To add or remove colors, or to register additional named themes, see the custom theme and multiple themes examples.
