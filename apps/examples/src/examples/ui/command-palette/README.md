---
title: Command palette
component: ./CommandPaletteExample.tsx
priority: 5
keywords: [command palette, command bar, cmd k, search, menu, keyboard, shortcuts]
---

Add your own commands to the command palette.

---

Press Cmd+K (Ctrl+K on Windows and Linux) to open the command palette. This example wraps `DefaultCommandPalette` to add a command of its own and a group that searches the text of shapes on the page. The group reads the query with `useCommandPaletteQuery` so it only renders its best matches.
