---
title: Custom tool (sticker)
component: ./CustomToolExample.tsx
priority: 0
keywords:
  [statenode, tool, pointer events, onpointerdown, onenter, cursor, createshape, state machine]
---

A minimal custom tool that drops a heart emoji wherever you click.

---

Tools are nodes in tldraw's state chart and are responsible for handling user input. A custom tool extends `StateNode`, sets a static `id`, and overrides event handlers such as `onEnter` and `onPointerDown`. Pass the class to `<Tldraw>` through the `tools` prop.

The sticker tool here sets a crosshair cursor when it becomes active and creates a text shape at `editor.inputs.getCurrentPagePoint()` on every pointer down. The example hides the UI and starts with the tool selected via `initialState`, so just click anywhere on the canvas. For a tool with child states and drag interactions, see the screenshot tool example; for adding a tool to the toolbar, see the custom shape and tool example.
