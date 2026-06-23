---
title: Shape factory
component: ./ShapeFactoryExample.tsx
priority: 5
keywords:
  [
    game,
    factory,
    shapez,
    factorio,
    logistics,
    belt,
    geo shape,
    line shape,
    overlay,
    overlayutil,
    custom tool,
    tick,
    animation,
    createshapes,
  ]
---

A Shapez/Factorio-style logistics puzzle built from tldraw primitives.

---

Shape factory borrows Mini Metro's design language and applies it to a factory game. Machines are real tldraw `geo` shapes — extractors (rectangles) emit raw shapes, painters (diamonds) recolour whatever passes through them, and the hub (an octagon) asks for one specific shape at a time. The belts that carry items between machines are `line` shapes, drawn with the same gesture as the rest of the game: a custom tool (`FactoryTool`, a `StateNode`) lets you drag from one machine to another to lay a belt, and click a belt to remove it.

The items flowing along the belts move every frame, so they're drawn on the canvas-2D `OverlayUtil` layer rather than as real shapes — the same split the other game examples use. A pure simulation (`sim.ts`, no tldraw imports) models the machine graph and conveys items along belts; `game-state.ts` publishes snapshots into atoms each tick, and the host syncs structural changes back into the locked `geo` and `line` shapes.

Drag between machines to route raw shapes through painters and into the hub. Match the hub's request — the shape and colour it shows — to score, and keep the deliveries coming.
