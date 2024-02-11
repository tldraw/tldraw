---
title: Custom actions menu content
component: ./CustomActionsMenuContentExample.tsx
category: ui
---

You can customize tldraw's actions menu content. Open the actions menu by clicking the "..." button in the menu, next to undo and redo, or just above the toolbar on mobile. There should be a new menu item there.

---

The actions menu can be customized by providing a `ActionsMenuContent` component to the `Tldraw` component's `uiComponents` prop. If you provide `null`, then that component will be hidden.
