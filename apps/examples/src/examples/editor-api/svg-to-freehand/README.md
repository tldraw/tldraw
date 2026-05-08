---
title: SVG to freehand
component: ./SvgToFreehandExample.tsx
keywords: [svg, freehand, draw, parse, programmatic creation, animation]
---

Trace an SVG as freehand draw shapes on the canvas.

---

This example takes a hardcoded SVG string, parses it into a list of point arrays
(handling paths, circles, ellipses, rects, lines, polylines, polygons, and nested
transforms), and creates one tldraw `draw` shape per stroke. SVG fill and stroke
colors are mapped to the nearest tldraw palette color.

The pipeline can be used as a starting point for hand-drawn-style rendering of any
SVG source — for example, the output of an LLM tool call, an icon library, or a
user-provided file.

The prompt input at the top of the panel calls the [Quiver](https://quiver.ai)
text-to-SVG API through a dev-server proxy. To enable it, add
`QUIVERAI_API_KEY=<your key>` to `apps/examples/.env.local` and restart `yarn dev`.
The key stays on the server; the browser only sees the resulting SVG.
