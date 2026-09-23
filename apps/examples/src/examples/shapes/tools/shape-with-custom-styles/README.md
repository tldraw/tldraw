---
title: Custom shape with custom styles
component: ./ShapeWithCustomStylesExample.tsx
priority: 1.5
keywords:
  [
    custom styles,
    styleprop,
    defineenum,
    style panel,
    defaultstylepanel,
    userelevantsstyles,
    setstyleforselectedshapes,
    shapeutil,
  ]
---

Define your own style with `StyleProp.defineEnum` and expose it in the style panel.

---

Styles are shape props that the editor tracks across selections: the style panel shows the shared value of every selected shape, and new shapes pick up the most recently used value. This example defines a custom "rating" style, uses it as a prop on a custom shape, and adds a dropdown for it to the default style panel using `useRelevantStyles` and `editor.setStyleForSelectedShapes`.

Select the shapes and change the rating in the style panel. Try selecting both shapes at once to see the "mixed" state.

To use tldraw's existing styles with your shapes, check the [tldraw styles example](https://tldraw.dev/examples/shape-with-tldraw-styles).
