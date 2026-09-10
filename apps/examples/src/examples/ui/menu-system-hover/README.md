---
title: Menu system hover
component: ./MenuSystemHoverExample.tsx
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
  ]
---

Open and close a dropdown menu from hover events using `editor.menus`.

---

tldraw keeps track of open menus in `editor.menus`, keyed by id. The UI's dropdown primitives read that state, so you can open or close a menu from anywhere by writing to it:

- `editor.menus.addOpenMenu(id)` opens a menu
- `editor.menus.deleteOpenMenu(id)` closes it
- `useMenuIsOpen(id)` subscribes to a menu's open state

Try hovering the green-labeled zone to open the dropdown and the red-labeled zone to close it. Clicking the trigger button still works as usual. This is handy for hover-driven toolbars or for closing menus in response to events elsewhere in your app.
