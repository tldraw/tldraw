---
title: Lasso select tool
component: ./LassoSelectToolExample.tsx
priority: 3
keywords:
  [
    lasso,
    selection,
    freehand,
    overlays,
    custom tool,
    state machine,
    atom,
    statenode,
    getstrokepoints,
    getsvgpathfromstrokepoints,
    overlayutil,
  ]
---

Select shapes by drawing a freehand lasso around them with a custom tool and a canvas overlay.

---

The tool is a `StateNode` with an `idle` child and a `lassoing` child. While lassoing, the tool stores the pointer's page-space points in an `atom`, so anything that reads them re-renders as they change. A custom `OverlayUtil` reads that atom, smooths the points with `getStrokePoints`, converts them to an SVG path with `getSvgPathFromStrokePoints`, and draws the result onto the canvas overlay with `Path2D`.

On pointer up, the tool selects every shape whose page-space vertices are all inside the lasso polygon (`pointInPolygon`) and whose outline does not cross the lasso (`polygonsIntersect`), then switches back to the select tool.

Press `W` or pick the lasso from the toolbar, then drag a loop around some shapes. Only shapes fully enclosed by the loop are selected.
