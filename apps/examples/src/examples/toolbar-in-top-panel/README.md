---
title: Toolbar in Top Panel
component: ./ToolbarInTopPanelExample.tsx
category: ui
priority: 2
keywords: [toolbar, top panel, custom ui, layout]
---

Move the toolbar from its default position to the top panel.

---

This example shows how to relocate the toolbar from its default position on the left side of the screen to the top panel in the center.

We accomplish this by:

1. Hiding the default toolbar with `Toolbar: null`
2. Creating a custom `TopPanel` component that includes the `DefaultToolbar`
3. Preserving the offline indicator functionality from the original top panel

This approach maintains all the toolbar's functionality while changing its visual position.
