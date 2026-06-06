---
title: Style panel color area height
component: ./StylePanelColorAreaExample.tsx
priority: 0
keywords: [style panel, color area, color picker, opacity, resize, scroll, options]
---

Cap the style panel's color area at a fixed height, or let it fit its content.

---

The color area at the top of the style panel holds the color picker and opacity slider. By default (`'auto'`) it grows to fit its content. Set it to a number of pixels to cap its height instead: the area scrolls when its content overflows and gains a drag handle so end users can resize it, with the chosen height persisted to localStorage and double-click to reset.

Set the default globally with the `stylePanelColorAreaHeight` editor option, or override it per instance with the `colorAreaHeight` prop on `DefaultStylePanelContent`. This example uses the prop and a button to toggle between a capped height and `'auto'`.
