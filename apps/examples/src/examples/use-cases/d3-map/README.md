---
title: D3 geo map
component: ./D3MapExample.tsx
keywords: [d3, geo, map, geography, shapes, states, topojson, visualization]
---

Render a D3 geo projection as a custom shape and explode it into one shape per US state.

---

The `us-map` shape draws every state path from `d3-geo` and `us-atlas` inside a single `SVGContainer`. Double-click it (or press its "Explode states" button) and it is replaced by one `us-state` shape per state, positioned and scaled from the map's page bounds. Each state can then be moved, resized, and selected on its own.

The explode runs inside `editor.run`, so deleting the map and creating the states is a single undo step. Use "Reset map" in the top panel to start over.
