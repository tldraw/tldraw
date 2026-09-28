---
title: Map tiles
component: ./MapTilesExample.tsx
priority: 3
keywords: [map, tiles, openstreetmap, mercator, geo, camera, level of detail, raster, annotation]
---

Draw on a slippy map by rendering OpenStreetMap tiles beneath the canvas.

---

Page space is defined as Web Mercator world pixels at a base map zoom, which turns the canvas into a real coordinate system. `lngLatToPage` and `pageToLngLat` in `mercator.ts` convert between page points and geographic coordinates, and the readout in the top panel shows the position under the pointer. Shapes drawn on top are pinned to the map and scale with it, so an annotation is geographic data rather than a mark on a canvas.

The tile layer is an `OnTheCanvas` component, so it renders inside the camera transform and beneath the shapes. Tiles are positioned in page units and the camera does the panning and scaling for free.

Two constraints shape the rest, both explained where they bite in the code: the zoom range is capped to a band around the base zoom (a real map's z0 to z19 would need a camera zoom range of around 500,000x), and tiles come from OpenStreetMap's public servers, which have a usage policy attached. Swap `getTileUrl` in `TileLayer.tsx` for your own provider before pointing this at real traffic.
