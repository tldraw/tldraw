---
title: Libraries
component: ./LibrariesExample.tsx
priority: 11
keywords: [libraries, library, reusable shapes, assets, components, panel, packs, save, place]
---

Save shapes to libraries and place them back onto the canvas.

---

A library is a named list of items, each a saved copy of some shapes. `LibrariesPanel` shows the libraries of a `LibrarySource` in a floating panel: click an item to place it in the middle of the viewport, or drag it out onto the canvas.

To save shapes, select them and click the + tile in a library, or right-click and pick "Add to library". The libraries button beside the quick actions opens and closes the panel, and the command palette (`Cmd+K` or `Ctrl+K`) lists the items too.

Libraries are a licensed feature. Everything works in local development, but a deployed app needs a license key that includes libraries.
