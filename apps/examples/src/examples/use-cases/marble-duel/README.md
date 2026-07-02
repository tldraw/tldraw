---
title: Marble duel
component: ./MarbleDuelExample.tsx
category: use-cases
priority: 3
keywords:
  [
    game,
    marbles,
    bounce,
    reflection,
    raycast,
    physics,
    geometry,
    draw,
    multiplayer,
    sync,
    meta,
    locked,
  ]
multiplayer: true
---

A multiplayer duel where your emitter fires marbles in a direction you can never change — you draw lines and shapes to bank your shots into the enemy emitter and to deflect theirs.

---

The whole game runs on one idea: **the game pieces are ordinary tldraw shapes**, so tldraw sync carries the entire game with no netcode of its own. Your emitter is a locked geo circle with its owner, firing angle, and hit points stored in the shape's `meta`. The marbles it fires are locked geo circles too, each carrying its velocity in `meta`. And the level itself is whatever anyone draws: every non-game shape on the page is turned into wall segments (via `Editor.getShapeGeometry` and the shape's page transform), so a freehand scribble, a line, an arrow, or a text label all bounce marbles the moment they exist — for everyone, symmetrically.

You can't aim. An emitter deploys pointing roughly across the arena with a random tilt baked in, and that tilt never changes — so a straight shot always misses, and drawing is the only aim you get. There's no trajectory preview either: you learn where your shots go by watching them bounce, and adjust your walls between volleys. Marbles that miss everything sail past the arena border and fall into the void; marbles that reach an enemy emitter cost it a hit point, and at zero the emitter is destroyed.

Ink is signed: everything you draw is created in your player color and can't be recolored, so every wall on the canvas shows who drew it. That's a store side effect — a before-create handler recolors local shapes and a before-change handler rejects recoloring — and it only runs for local mutations, so synced shapes keep their author's color.

Each client simulates only what it owns. Your client fires your marbles on a cadence, integrates their motion each tick (raycasting ahead and reflecting off wall segments), detects your marbles reaching enemy emitters, and writes the damage onto the enemy's emitter shape — everyone else just receives those shape updates through sync. Game mutations run inside `editor.run` with `history: 'ignore'` (so undo only touches your drawings, never the simulation) and `ignoreShapeLock: true` (the pieces are locked so players can't drag or erase them, but the game can still move them).

Nothing extra is synced for the effects, either: every client watches the synced shapes change, and derives the drama locally — an emitter whose `hp` just dropped flashes, an emitter that stopped existing explodes where it stood. Death itself is just "my emitter shape is gone", which is what flips the HUD to the redeploy card. The overlay (barrels, HP arcs, explosions) is a screen-space canvas in the `InFrontOfTheCanvas` slot, mapping page points through `pageToViewport` each tick so it tracks the camera for free.
