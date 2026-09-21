---
title: Selection color condition
component: ./SelectionColorConditionExample.tsx
priority: 3
keywords:
  [
    selection,
    color,
    conditional styling,
    css variables,
    react,
    getselectedshapes,
    isshapeoftype,
    css class,
  ]
---

Turn the selection red whenever every selected shape is a rectangle.

---

Selection colors are part of the editor's theme (`selectionStroke` and `selectionFill` in `TLTheme`), so changing them means swapping the theme rather than overriding CSS variables. This example clones `DEFAULT_THEME` into a red variant, then uses `react` inside `onMount` to watch `editor.getSelectedShapes()` and call `editor.updateTheme` with either variant depending on the selection.

Try selecting the two rectangles (red), then add the ellipse to the selection (back to blue).
