---
title: Page panel
component: ./PagePanelExample.tsx
category: ui
priority: 5
keywords: [pages, page menu, sidebar, thumbnails, previews, external ui, page list]
---

Replace the page menu with a custom sidebar showing live thumbnails of every page.

---

This example shows how to build a custom page panel in your own DOM, outside the canvas, like the page sidebars in note-taking apps.

A page list is always regular DOM UI, never canvas content: the canvas only renders the shapes of the current page. The panel uses `editor.getPages()` inside `useValue` to re-render reactively whenever pages change, and `editor.setCurrentPage`, `editor.createPage`, `editor.renamePage`, and `editor.deletePage` to manage them. Double-click a page to rename it.

Because pages other than the current one are never rendered on the canvas, the thumbnails are exported images: `editor.getPageShapeIds(pageId)` and `editor.getSvgString` both work for any page, not just the current one. Thumbnails regenerate on a debounced store listener as you draw.
