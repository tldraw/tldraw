---
title: Custom keyboard shortcuts
component: ./KeyboardShortcutsExample.tsx
priority: 3
keywords: [shortcuts, hotkeys, keybindings, kbd, overrides, actions, tools, customize]
---

Change tldraw's default keyboard shortcuts for tools and actions.

---

Shortcuts are the `kbd` field on tool and action definitions. Use the `actions` and `tools` functions of `TLUiOverrides` to return copies with different `kbd` strings, then pass the overrides to `<Tldraw>`. The keyboard shortcuts dialog reads the same field, so it updates automatically.

Try it:

- Press `x` to toggle the grid
- Press `p` to select the draw tool
- Press `cmd+1` (or `ctrl+1`) to copy the selection as a PNG

For adding shortcuts to custom tools, see the custom config example.
