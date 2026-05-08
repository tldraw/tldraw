---
title: tlcraft RTS
component: ./TlcraftExample.tsx
priority: 6
keywords:
  [overlay, overlayutil, canvas, animation, game, rts, strategy, selection, hit testing, tick]
---

A tiny Warcraft / Age of Empires style real-time strategy game built on the OverlayUtil system.

---

You start with a Town Hall and three workers. Send workers to chop trees and mine gold, then train soldiers from a Barracks and defend against waves of enemies that spawn from the east. Left-click or drag a box to select units. Right-click anywhere to command — empty ground moves, a tree or gold mine gathers, and an enemy attacks. The Train and Build buttons in the toolbar queue new units and arm a building for placement.

The map, terrain, units, projectiles, drag-selection box, and training-queue rings all render through `OverlayUtil` subclasses. Game state lives in `@tldraw/state` atoms read inside `getOverlays()`, so when the loop ticks the atoms, every overlay redraws reactively. Buildings the player places are real locked geo shapes whose `meta.buildingKind` the game loop reads on each tick.
