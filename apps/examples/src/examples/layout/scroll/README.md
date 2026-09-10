---
title: Scrollable container
component: ./ScrollExample.tsx
priority: 1
keywords: [scrollable, container, layout, autofocus, focus, mousewheel, viewport, nested]
---

Use the editor inside a page that scrolls, and see how focus decides who gets the wheel events.

---

The `Tldraw` component works inside a scrollable page. The one thing to be aware of is the mouse wheel: while the editor is focused it consumes wheel events to pan and zoom the canvas, and the page doesn't scroll. When it's blurred, wheel events pass through and the page scrolls as normal.

Here the editor is centered in a container larger than the viewport, with `autoFocus` on. Try scrolling with the pointer over the canvas, then set `autoFocus={false}` and try again.
