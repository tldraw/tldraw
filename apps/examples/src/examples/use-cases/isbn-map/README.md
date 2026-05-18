---
title: ISBN map
component: ./IsbnMapExample.tsx
keywords: [isbn, map, books, dataset, tiled-image, projection, large-canvas, image-shape]
---

A pannable, zoomable map of the English-language quadrant of ISBN-space, layered on a tldraw canvas. Zoom in deep enough and each individual book becomes a colored spine you can hover over for live metadata.

---

This example bundles a slice of the precomputed tiles from [phiresky/isbn-visualization-images](https://github.com/phiresky/isbn-visualization-images) and lays them on a tldraw canvas using the built-in `image` shape. Each tile covers one ISBN prefix range (e.g. `978-0-14-…` is one Penguin tile); positions come from porting the upstream "bookshelf" projection — including its inverse — to a few lines of TypeScript so we can go both directions: ISBN → canvas rect and canvas point → ISBN.

The example demonstrates several patterns useful for any large, externally-sourced visualization on a tldraw canvas:

- **Loading many image assets at once via `editor.createAssets` + `editor.createShapes`**, the same pattern used by the PDF editor example.
- **Locked, deterministic-ID shapes** so the map can't be accidentally moved and switching dataset layers is a cheap shape update rather than a destructive recreate.
- **A camera constrained to the bounds of the data** with a wide zoom range so users can pull all the way back or zoom deep enough to see individual book spines.
- **Custom `TopPanel`, `OnTheCanvas`, and `InFrontOfTheCanvas` UI slots** — the dataset switcher and label toggle live in the top panel; a non-scaling-stroke SVG overlay and the synthesised book-spine layer live on-the-canvas (in page coords, so they scale with zoom); the bottom-left hover info panel lives in-front-of-the-canvas (in screen coords, so it stays put).
- **Live reverse-projection on hover.** The current page-point is fed through the inverse of the bookshelf projection to recover an exact ISBN-13, which is then looked up against a hand-curated publisher table and (debounced + cached) fetched from the public Google Books API for title/author/cover-thumbnail metadata.
- **Synthesised book spines that take over from the tiles at zoom 1×.** A recursive descent of the projection's prefix tree — pruned to the current viewport — draws every visible book as its own colored rect. The descent only emits rects at _even_ prefix lengths because that's where the bookshelf projection's cells are tall-vertical (3.16:1 aspect, book-shaped); odd-depth cells are skipped because they'd render as wide horizontal "shelves". The result: every visible spine, at every zoom level, points the same way. The depth at which the descent stops adapts to zoom so each rendered spine is ~10 CSS px wide regardless of how far in you are — coarse 10-book groups when you're zoomed mid-range, individual ISBNs at 100× zoom. Inspired by the upstream's WebGL `bookshelfOverlay` shader, each spine also gets deterministic per-ISBN jitter on its width/height plus stacked gradient overlays that darken the head, tail, and sides — so each rect reads as a real 3D binding rather than a flat box.
- **Crisp tile pixels.** The image shapes carry `image-rendering: pixelated` so when you zoom past 1× and before the synthesised spines layer fully fades in, the tile PNGs stay sharp instead of bilinear-blurring into mushy heatmap blobs.
- **The standard tldraw UI is hidden** (toolbar, style panel, main menu, navigation panel, etc.) by passing `null` for them in the `components` prop, leaving a focused, immersive map view. Only our `TopPanel`, on-canvas overlays, and `InFrontOfTheCanvas` overlays (minimap + hover panel) remain.
- **A minimap of the full ISBN space.** Top-right, a small SVG widget renders all of 978-_ / 979-_ as labelled language-group blocks. The blocks we have tiles for (English, prefix `00`/`01`) are full-color and clickable to fly the camera there; the rest are dimmed to make clear they're out of scope for this example. The current viewport is drawn on top, and dragging anywhere on the minimap pans the main camera while staying clamped to the data region.

Try switching layers and turning on labels to see well-known publisher imprints (Penguin Random House and friends) show up across their ISBN territory. Zoom in deep over a publisher you recognize, pause on a book, and Google Books will pull in the title and cover. The user can still draw on top, drop sticky notes, or sketch annotations to mark interesting books.

The bundled tiles only cover ISBN prefixes 978-0-_ and 978-1-_ (English-language books). To extend this to other regions or finer base-tile zoom levels, copy more tiles from the upstream image repo into `apps/examples/public/isbn-map/tiled/` and add their prefixes to `tile-manifest.ts`.
