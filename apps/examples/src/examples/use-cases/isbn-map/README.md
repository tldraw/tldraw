---
title: ISBN map
component: ./IsbnMapExample.tsx
keywords: [isbn, map, books, dataset, tiled-image, projection, large-canvas, image-shape]
---

A pannable, zoomable map of the English-language quadrant of ISBN-space, layered on a tldraw canvas with annotation tools.

---

This example bundles a slice of the precomputed tiles from [phiresky/isbn-visualization-images](https://github.com/phiresky/isbn-visualization-images) and lays them on a tldraw canvas using the built-in `image` shape. Each tile covers one ISBN prefix range (e.g. `978-0-14-…` is one Penguin tile); positions come from porting the upstream "bookshelf" projection to a few lines of TypeScript.

The example demonstrates several patterns useful for any large, externally-sourced visualization on a tldraw canvas:

- **Loading many image assets at once via `editor.createAssets` + `editor.createShapes`**, the same pattern used by the PDF editor example.
- **Locked, deterministic-ID shapes** so the map can't be accidentally moved and switching dataset layers is a cheap shape update rather than a destructive recreate.
- **A camera constrained to the bounds of the data** so users can pan/zoom freely but never get lost in the void.
- **Custom `TopPanel` and `OnTheCanvas` UI slots** for switching dataset layers (publishers vs. all books vs. publication date vs. library rarity), toggling labels, and showing a live ISBN-prefix readout under the cursor.

Try switching layers and turning on labels to see well-known publisher imprints (Penguin Random House and friends) show up across their ISBN territory. The user can still draw on top, drop sticky notes, or sketch annotations to mark interesting books.

The bundled tiles only cover ISBN prefixes 978-0-_ and 978-1-_ (English-language books). To extend this to other regions or finer zoom levels, copy more tiles from the upstream image repo into `apps/examples/public/isbn-map/tiled/` and add their prefixes to `tile-manifest.ts`.
