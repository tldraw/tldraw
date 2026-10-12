---
title: Tower defense
component: ./TowerDefenseExample.tsx
priority: 5
keywords: [overlay, overlayutil, canvas, animation, game, hit testing, raf, tick]
---

A small tower defense game whose enemies, projectiles, and effects are drawn with `OverlayUtil` classes on the overlay canvas.

---

Pick a tower from the toolbar (or press 1, 2, or 3) and click the canvas to place it. Each tower is a locked geo shape (triangle, rectangle, or ellipse) with its own range, fire rate, damage, and projectile. Enemies follow a fixed path; click an enemy to deal damage by hand, and hover a tower to see its range and an upgrade button.

Everything that moves is an `OverlayUtil` subclass registered through the `overlayUtils` prop: the path, enemies, projectiles, explosions, tower ranges, the placement preview, and the upgrade button. Game state lives in `atom`s that `getOverlays()` reads, so when the game loop updates them every overlay redraws reactively. Overlays that respond to input implement `getGeometry()` for hit testing, `getCursor()` for the hover cursor, and `onPointerDown()` for clicks; the editor routes pointer events to them before the canvas.

The game loop runs on the editor's `tick` event, which fires once per frame with the elapsed milliseconds. Tower placement itself goes through an overlay too: the preview follows the pointer and its `onPointerDown` creates the geo shape.
