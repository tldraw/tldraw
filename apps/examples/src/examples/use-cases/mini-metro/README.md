---
title: Mini Metro
component: ./MiniMetroExample.tsx
priority: 5
keywords:
  [
    game,
    metro,
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

A Mini Metro–style transit game built from tldraw primitives.

---

Mini Metro maps almost perfectly onto tldraw's own vocabulary, so this example builds it from real canvas primitives. Stations are `geo` shapes — a circle, triangle, square, diamond, pentagon, or star — and the metro lines you draw between them are `line` shapes in the tldraw palette. Building a line is the same gesture as drawing on a whiteboard: a custom tool (`MetroTool`, a `StateNode`) lets you drag from one station to another to connect them.

Trains and waiting passengers move every frame, so they're drawn on the canvas-2D `OverlayUtil` layer rather than as real shapes — the same split the other game examples use. A pure simulation (`sim.ts`, no tldraw imports) is the source of truth; `game-state.ts` publishes snapshots into atoms each tick, and the host syncs structural changes back into the locked `geo` and `line` shapes.

Drag between stations to lay your lines, route passengers to a station matching their shape, and keep stations from overcrowding. Press <kbd>R</kbd> after a game over to play again.
