---
title: Custom main menu content
component: ./CustomMainMenuContentExample.tsx
category: ui
---

You can customize tldraw's main menu content. Open the main menu by clicking the "?" button at the bottom right of the editor. There should be a new menu item there.

---

The main menu content can be customized by providing a `MainMenuContent` component to the `Tldraw` component's `uiComponents` prop. If you provide `null`, then that component will be hidden.
