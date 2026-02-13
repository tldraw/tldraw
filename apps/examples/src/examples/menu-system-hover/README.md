---
title: Menu system hover
component: ./MenuSystemHoverExample.tsx
category: ui
priority: 1
keywords:
  [
    menu,
    hover,
    dropdown,
    programmatic,
    control,
    editor.menus,
    addopenmenu,
    deleteopenmenu,
    usemenuisopen,
    ui,
  ]
---

Programmatically control dropdown menus via hover interactions using the editor's menu tracking API.

---

This example demonstrates how to open and close menus programmatically using the `editor.menus` API. Instead of relying solely on click triggers, you can control menu state in response to any UI event—in this case, hovering over specific zones.

The key APIs used are:

- `editor.menus.addOpenMenu(id)` - Register a menu as open
- `editor.menus.deleteOpenMenu(id)` - Close a specific menu
- `useMenuIsOpen(id)` - Subscribe to menu state reactively

This pattern is useful for building custom toolbars, navigation systems, or any UI where menus should respond to external events rather than just their own triggers.
