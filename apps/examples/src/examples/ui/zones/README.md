---
title: UI zones
component: ./ZonesExample.tsx
priority: 1
keywords:
  [zones, TopPanel, SharePanel, ui zones, custom panels, components override, top zone, share zone]
---

Fill the empty `TopPanel` and `SharePanel` slots with your own components.

---

The default UI leaves two slots empty for you: `TopPanel` in the top center of the screen and `SharePanel` in the top right, above the style panel. Set either one through the `components` prop to render your own React component there. tldraw.com uses them for the document title and the share button.
