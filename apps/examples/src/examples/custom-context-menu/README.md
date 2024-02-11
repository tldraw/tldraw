---
title: Custom context menu
component: ./CustomContextMenuExample.tsx
category: ui
---

Customize tldraw's context menu. Open the context menu by right clicking or long-pressing on the canvas. There should be a new menu item there.

---

The context menu can be customized by providing a `ContextMenuContent` component to the `Tldraw` component's `uiComponents` prop. If you provide `null`, then that component will be hidden.
