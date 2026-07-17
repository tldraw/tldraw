---
title: Page panel
component: ./PagePanelExample.tsx
category: ui
priority: 5
keywords: [pages, page menu, sidebar, thumbnails, previews, external ui, page list]
---

Replace the page menu with a custom sidebar with live thumbnails of every page.

---

This example shows how to build a custom page panel in your own DOM, outside the canvas. The panel uses `editor.getPages()` inside `useValue` to re-render whenever pages change. It manages pages with `editor.setCurrentPage`, `editor.createPage`, `editor.renamePage`, and `editor.deletePage`. Double-click a page to rename it.

The canvas only renders the current page, so the thumbnails are exported images: `editor.getPageShapeIds(pageId)` and `editor.getSvgString` both work for any page, not just the current one. Thumbnails regenerate on a debounced store listener as you draw.
