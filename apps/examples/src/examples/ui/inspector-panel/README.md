---
title: Inspector panel
component: ./InspectorPanelExample.tsx
priority: 5
keywords:
  [
    inspector,
    properties,
    props,
    selection,
    panel,
    debug,
    usevalue,
    bindings,
    shared styles,
    getselectedshapes,
    getbindingsinvolvingshape,
    editorprovider,
  ]
---

Show the properties, shared styles, and bindings of the current selection in a side panel.

---

The panel is a plain React component rendered next to `<Tldraw>` rather than inside it. The editor instance is captured from `onMount` and passed to `EditorProvider`, which makes `useEditor()` and `useValue()` work outside the canvas.

With one shape selected it lists the shape's record fields and `props`, plus any bindings from `editor.getBindingsInvolvingShape()`. With several selected it shows `editor.getSharedStyles()`, marking styles that differ across the selection as mixed.

Try selecting a shape, then drawing an arrow to it and selecting the arrow to see its binding. Select several shapes with different colors to see mixed styles.
