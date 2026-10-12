---
title: Editor options
component: ./CustomOptionsExample.tsx
priority: 0
keywords: [options, configuration, pages, animation, camera]
---

Override editor options like the maximum number of pages and animation duration.

---

The `options` prop on `Tldraw` takes a `Partial<TldrawOptions>` and overrides tldraw's defaults; anything you leave out keeps its default value. Options are read once when the editor is created, so define the object outside the component (or memoize it) rather than creating a new one on every render.

This example limits documents to 3 pages and sets `animationMediumMs` to 5 seconds. Try opening the page menu and adding pages: the "create page" button disables after the third. Then zoom in or out from the zoom menu and watch the (very) slow animation.
