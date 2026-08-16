---
title: Custom canvas components
component: ./CustomComponentsExample.tsx
priority: 2
keywords:
  [
    components,
    Background,
    Canvas,
    Grid,
    Cursor,
    ShapeIndicator,
    OnTheCanvas,
    InFrontOfTheCanvas,
    custom ui,
    override,
  ]
---

Replace tldraw's on-canvas components, such as the background, with your own.

---

tldraw's on-canvas UI is built from replaceable React components: the background, grid, cursors, shape indicators, and more. Pass your own via the `components` prop, or pass `null` to hide one. This example replaces the `Background` component with a light blue div. See `TLEditorComponents` for the full list of slots.
