---
title: Custom shape and tool
component: ./CustomConfigExample.tsx
keywords:
  [
    shapeutils,
    tools,
    toolbar,
    custom tool,
    custom shape,
    icon,
    overrides,
    card,
    statenode,
    keyboard shortcut,
    migrations,
  ]
priority: 1
---

Register a custom shape and a tool that creates it, with a toolbar button and keyboard shortcut.

---

The card shape is defined by `CardShapeUtil` (rendering, geometry, resizing, props validation, and migrations) and created by `CardShapeTool`, which extends `BaseBoxShapeTool` to get click-and-drag creation for free. Both are passed to `<Tldraw>` through the `shapeUtils` and `tools` props.

The `ui-overrides.tsx` file adds the tool to the UI: the `tools` override registers it with an icon, label, and the `c` shortcut, and the custom `Toolbar` and `KeyboardShortcutsDialog` components place it alongside the defaults.

Select the card tool in the toolbar (the ⚫️ icon) or press `c`, then click or drag on the canvas to create a card. The card's button counts clicks to show that ordinary React state works inside a shape component.
