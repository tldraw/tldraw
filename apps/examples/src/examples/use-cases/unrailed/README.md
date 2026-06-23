---
title: Unrailed
component: ./UnrailedExample.tsx
priority: 5
keywords:
  [overlay, overlayutil, draw shape, freehand, perfect freehand, canvas, game, tick, camera, follow]
---

A tldraw take on Unrailed where you draw the railroad and a train rides your ink.

---

The train rolls along the track on its own and speeds up as you go. **Draw** from the glowing ring to lay track ahead of it — straight, curved, looping, however you like — and the train follows the line by arc-length, rotating to face the way it bends. Drawing over 🌲/⛰️ harvests wood and iron; the wagon crafts those into more track budget. Draw a 🌉 **Bridge** (a geo rectangle) across a river to cross it. Scroll to zoom and scout ahead. Run out of drawn track and it's game over — press <kbd>R</kbd> to restart.

The example makes tldraw's primitives the gameplay verbs. The track is genuine canvas ink: each accepted stroke is the player's own `draw` shape, locked and restyled, with a cross-ties overlay so any curve reads as railroad. Bridges are real `geo` shapes. A finished stroke is classified by where it starts — at the track head it extends the path, elsewhere it chops obstacles — so one tool does both. Everything that moves every frame (terrain, train, ties, hints) is drawn through `OverlayUtil` subclasses straight to a canvas context in page space, which stays cheap at 60fps.

The simulation is a plain mutable object advanced on the editor's `tick` event; a `frame$` atom is bumped each tick so the overlays redraw, while value atoms feed the HUD. The camera uses a deadzone so it only pans when the train drifts out of a central box, keeping the canvas still while you draw, and zoom stays unlocked for scouting.
