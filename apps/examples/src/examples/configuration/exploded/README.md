---
title: Sublibraries
component: ./ExplodedExample.tsx
priority: 100
keywords:
  [
    tldraweditor,
    tldrawui,
    sublibraries,
    modular,
    architecture,
    defaultshapeutils,
    defaulttools,
    components,
  ]
---

Assemble the `Tldraw` component yourself from `TldrawEditor`, `TldrawUi`, and the default shapes and tools.

---

The `Tldraw` component is a convenience wrapper. Underneath it is `TldrawEditor` (the canvas and editor, with no shapes, tools, or UI of its own), `TldrawUi` (the default menus, toolbar, and panels), and a set of defaults: `defaultShapeUtils`, `defaultBindingUtils`, `defaultTools`, `defaultShapeTools`, and so on.

This example builds the same editor from those pieces. It behaves like the plain `Tldraw` component, but every part is now visible and replaceable: drop a shape util from the list, pass a different tool set, or leave out `TldrawUi` and supply your own interface. The only-editor example goes further and uses `TldrawEditor` with a single custom shape and tool.
