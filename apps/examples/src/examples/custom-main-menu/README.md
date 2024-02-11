---
title: Custom main menu
component: ./CustomMainMenuExample.tsx
category: ui
---

You can customize tldraw's main menu. Open the main menu by clicking the "?" button at the bottom right of the editor. There should be a new menu item there.

---

The main menu content can be customized by providing a `MainMenuContent` component to the `Tldraw` component's `uiComponents` prop. If you provide `null`, then that component will be hidden.
