---
title: DOM-based shape size
component: ./SizeFromDomExample.tsx
priority: 10
keywords:
  [
    dom sizing,
    dynamic size,
    resizeobserver,
    editoratom,
    atommap,
    getgeometry,
    measure,
    htmlcontainer,
    responsive,
  ]
---

Size a custom shape from its rendered DOM instead of from `w` and `h` props.

---

Most shapes store their size as props. This shape has none: its component measures its own DOM element (with a `ResizeObserver`) and writes the result into an `EditorAtom` holding an `AtomMap` of shape id to size. `getGeometry` reads that atom, so selection bounds, hit testing, and the indicator update reactively as the content changes.

The shape's text animates in and out so you can watch the selection bounds follow it. Select the shape to see the indicator track the measured height.
