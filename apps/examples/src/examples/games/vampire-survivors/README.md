---
title: Vampire survivors
component: ./VampireSurvivorsExample.tsx
priority: 5
keywords: [overlay, overlayutil, canvas, game, animation, tick, raf, camera, follow, raycast]
---

A horde-survival game built on the canvas, with the swarm drawn on the OverlayUtil system and a first-person raycast view of the same world.

---

Move with `WASD` (or arrow keys). Your character is a real tldraw shape and the camera follows it; your weapon auto-fires at the nearest enemy. Survive the growing swarm, collect the XP gems that drop, and pick an upgrade each time you level up.

The design splits cleanly along tldraw's two rendering paths:

- **The player is a real tldraw shape**, drawn in the hand-drawn (`dash: 'draw'`) style and moved by the simulation each frame with the camera locked to it.
- **The swarm, projectiles, and gems are canvas overlays.** These are the perf-intensive parts — potentially hundreds of entities moving every frame — so they live on the single shared overlay canvas (`OverlayUtil`) instead of as DOM shapes. They're drawn imperatively in the tldraw palette with a cheap hand-drawn wobble (`sketch.ts`) so the swarm reads as tldraw without running perfect-freehand per entity.

Everything is driven from one `editor.on('tick')` loop. The simulation (`sim.ts`) is pure and renderer-agnostic: it models the world as line segments plus entity data, with the player carrying a facing direction. That pays off in the **first-person picture-in-picture view** (`RaycastView.tsx`): it's a second renderer over the very same `Player` + `Segment[]` world, raycasting the walls with `castColumns` and billboarding the enemies with `projectToCamera` from `engine.ts`. It looks wherever you're moving, so it needs no separate controls. Any shape you draw on the canvas becomes a wall that blocks the swarm and shows up in both views.
