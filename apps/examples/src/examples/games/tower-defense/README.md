---
title: Tower defense
component: ./TowerDefenseExample.tsx
priority: 5
keywords: [overlay, overlayutil, canvas, animation, game, hit testing, raf, tick]
---

A tiny tower defense game built on the OverlayUtil system.

---

Draw triangle, rectangle, or ellipse geo shapes onto the canvas to place towers — each geo type maps to a different tower with its own range, fire rate, damage, and projectile. Enemies follow a fixed path; click an enemy to deal damage manually.

The game's path, enemies, projectiles, and tower range indicator all render through `OverlayUtil` subclasses. The game state lives in `@tldraw/state` atoms read inside `getOverlays()`, so when the game loop ticks the atoms, every overlay redraws reactively. Hit-testing for clicks on enemies uses `getGeometry()` and the built-in `editor.overlays.getOverlayAtPoint` path; `getCursor()` swaps to a crosshair on hover and `onPointerDown()` applies damage.

The game loop is driven by the editor's `tick` event, which fires once per frame with the elapsed delta in milliseconds. Towers are real geo shapes that the side-effects layer locks on creation so they can't be moved during play.
