---
title: Custom shape
component: ./CustomShapeExample.tsx
priority: 0
keywords:
  [
    shapeutil,
    custom shape,
    getGeometry,
    component,
    indicator,
    HTMLContainer,
    Rectangle2d,
    getDefaultProps,
    props,
    validator,
  ]
---

Define a minimal custom shape with a `ShapeUtil` and add it to the editor.

---

A custom shape needs a `ShapeUtil` subclass that declares its `type` and prop validators, returns default props, provides geometry for hit-testing, and renders a React component. Pass the util class to `<Tldraw>` through the `shapeUtils` prop and the editor can create, select, resize, and persist the shape like any built-in one.

This example's shape is a rectangle with some text inside. It extends `ShapeUtil` directly so you can see `getGeometry` and `onResize` written out; extending `BaseBoxShapeUtil` would provide both for a `w`/`h` shape. The shape is created in `onMount`. To add a toolbar tool for creating it, see the custom shape and tool example.
