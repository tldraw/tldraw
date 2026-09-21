---
title: Dynamic tools with setTool and removeTool
component: ./DynamicToolsExample.tsx
priority: 2
keywords:
  [settool, removetool, dynamic tools, runtime, conditional, permissions, feature flags, toolbar]
---

Add and remove a tool from the editor and toolbar at runtime with `setTool` and `removeTool`.

---

Tools are normally passed to `<Tldraw>` once via the `tools` prop. `editor.setTool(Tool)` and `editor.removeTool(Tool)` let you add and remove tools from the state chart after the editor has mounted, which is useful for permission checks, feature flags, or plugin-style features.

The example adds a heart-stamp tool that isn't installed initially. Click "Add heart tool" to install it (it appears in the toolbar and can be selected with `y`), stamp a few hearts, then click "Remove heart tool" to take it away again. Notice that the toolbar entry is driven by a small atom rather than React state, so the `components` object stays stable.
