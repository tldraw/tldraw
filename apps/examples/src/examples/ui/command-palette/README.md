---
title: Command palette
component: ./CommandPaletteExample.tsx
priority: 5
keywords: [command palette, command bar, cmd k, menu, keyboard, shortcuts]
---

Add your own commands to the command palette.

---

Press Cmd+K (Ctrl+K on Windows and Linux) to open the command palette. The palette lives in the `@tldraw/command-palette` package. Actions are listed in the palette on their own; this example wraps `CommandPalette` to place a custom action in a group of its own, add a submenu, and move the palette to the top of the screen, and adds a main menu item that opens it.
