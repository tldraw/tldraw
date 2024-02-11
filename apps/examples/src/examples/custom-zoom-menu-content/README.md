---
title: Custom zoom menu content
component: ./CustomZoomMenuContentExample.tsx
category: ui
---

You can customize tldraw's zoom menu content. Open the zoom menu by clicking the "100%" button at the bottom left of the editor. There should be a new menu item there.

---

The zoom menu can be customized by providing a `ZoomMenuContent` component to the `Tldraw` component's `uiComponents` prop. If you provide `null`, then that component will be hidden instead.
