---
title: Changing menus
component: ./CustomMenusExample.tsx
priority: 0.5
keywords:
  [
    menu,
    toolbar,
    context menu,
    main menu,
    page menu,
    ActionsMenu,
    DebugMenu,
    HelpMenu,
    StylePanel,
    QuickActions,
    ZoomMenu,
    components,
    TldrawUiMenuItem,
  ]
---

Add items to every one of tldraw's menus, including the toolbar, main menu, context menu, and page menu.

---

Use the `components` prop to override tldraw's default menus. You can provide a React component of your own, import the default component and add to it, or return `null` to hide it completely. Each default menu comes as a pair, for example `DefaultMainMenu` and `DefaultMainMenuContent`, so you can wrap the default content with your own items. This example customizes every menu in tldraw:

- Toolbar
- Main menu
- Context menu
- Page menu
- Actions menu
- Debug menu
- Help menu
- Keyboard shortcuts dialog
- Navigation panel
- Quick actions panel
- Style panel
- Zoom menu

The custom additions are highlighted in thistle so they're easy to spot.
