---
title: Remove a tool from the toolbar
component: ./RemoveToolExample.tsx
priority: 0
keywords:
  [
    hide tool,
    remove tool,
    overrides,
    customization,
    toolbar customization,
    disable tool,
    tool visibility,
  ]
---

Remove the text tool from the toolbar and keyboard shortcuts with a `tools` override.

---

The `tools` override in `TLUiOverrides` receives the map of UI tool items and returns the one the UI should use. Deleting an entry removes that tool from the toolbar, its keyboard shortcut, and the keyboard shortcuts dialog. The tool is still registered with the editor, so it can be activated programmatically with `editor.setCurrentTool`. Here we remove the text tool; try pressing `T` and note that nothing happens.
