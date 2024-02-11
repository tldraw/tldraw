---
title: Custom help menu content
component: ./CustomHelpMenuContentExample.tsx
category: ui
---

You can customize tldraw's help menu content. Open the help menu by clicking the "?" button at the bottom right of the editor. There should be a new menu item there.

---

The help menu content can be customized by providing a `HelpMenuContent` component to the `Tldraw` component's `uiComponents` prop. If you provide `null`, then that component will be hidden.
