---
title: Custom zoom menu
component: ./CustomZoomMenuExample.tsx
category: ui
---

You can customize tldraw's zoom menu.

---

The zoom menu is in the bottom left of the tldraw component, the button to open it is labeled with a percentage indicating the editor's current zoom level. It can be customized by providing a `ZoomMenu` component to the `Tldraw` component's `components` prop. If you provide `null`, then that component will be hidden instead.
