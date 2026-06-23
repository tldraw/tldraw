---
title: Voronoi territory
component: ./VoronoiExample.tsx
priority: 5
keywords:
  [
    game,
    voronoi,
    territory,
    custom shape,
    shapeutil,
    geometry,
    polygon,
    overlay,
    overlayutil,
    custom tool,
    tick,
    createshapes,
  ]
---

A Voronoi territory game built from tldraw primitives.

---

Every point on the board belongs to the nearest site, so each site you place claims a Voronoi cell. You and an opponent take turns dropping sites; whoever's cells cover more of the board wins. As you hover, the overlay previews the cell you'd carve out, and clicking places a site — the same lightweight gesture the other game examples use, driven by a custom tool (`VoronoiTool`, a `StateNode`).

The cells are real tldraw shapes: a small custom `ShapeUtil` (`VoronoiCellShapeUtil`) renders each cell as a smooth, rounded "bubble" in its owner's colour — every corner is softened with a quadratic curve, the same trick the paper.js Voronoi example uses — so the finished map is made of genuine canvas shapes you can select and restyle. A pure simulation (`sim.ts`, no tldraw imports) owns the game state and computes the diagram by half-plane clipping — no Voronoi library needed — and `game-state.ts` publishes snapshots into atoms each tick. The host syncs structural changes into the locked cell shapes; the site markers and hover preview move interactively, so they're drawn on the canvas-2D `OverlayUtil` layer.

It's played on a bullet-chess clock: each side gets one sharp time bank that ticks down only on its own turn, and running out flags you an instant loss whatever the area says. Place fast, out-control the board. Press <kbd>R</kbd> after the game ends to play again.
