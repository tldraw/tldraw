---
title: Adventure capitalist game
component: ./AdventureCapitalistExample.tsx
priority: 5
keywords:
  [
    game,
    idle,
    incremental,
    clicker,
    simulation,
    tick,
    animation,
    progress bar,
    createshapes,
    updateshape,
  ]
---

A small idle/incremental game built entirely from built-in tldraw shapes.

---

This is a proof-of-concept "AdVenture Capitalist"-style idle game made with nothing but tldraw's built-in `geo` and `text` shapes. There are no custom shapes — the shapes are purely the rendering layer, and all game state and animation lives in plain JavaScript driving the editor API.

Click a business to run a production cycle and earn money. Spend money to buy more units (raising both income and the next unit's price) or to hire a manager that keeps the cycle running automatically.

It demonstrates a few editor patterns working together:

- Creating a board of shapes once with `editor.createShapes`, then locking them with `editor.toggleLock`.
- A per-frame game loop via `editor.on('tick', ...)`.
- Writing shape updates inside `editor.run(fn, { history: 'ignore', ignoreShapeLock: true })` so the simulation never pollutes the undo stack and can mutate locked shapes.
- Reading clicks with `editor.on('event', ...)` and resolving the tapped shape with `editor.getShapeAtPoint(..., { hitLocked: true })`.
- A diff-based renderer that only rewrites the shapes whose displayed value actually changed.
