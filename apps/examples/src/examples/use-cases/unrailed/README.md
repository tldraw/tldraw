---
title: Unrailed
component: ./UnrailedExample.tsx
priority: 5
keywords: [overlay, overlayutil, draw shape, canvas, game, tick, animation, camera, follow]
---

A tldraw take on Unrailed — keep laying track so the train never runs out of rails.

---

The train rolls right on its own and speeds up as you go. Walk the worker with <kbd>W</kbd>/<kbd>A</kbd>/<kbd>S</kbd>/<kbd>D</kbd> into trees and rocks to harvest wood and iron; the wagon crafts those into rails, and <kbd>Space</kbd> lays the next rail ahead of the train. Clear any obstacle sitting on the track row before you can build through it. Run out of track and it's game over — press <kbd>R</kbd> to restart.

The example shows the two tldraw rendering paths working together. The **rails you lay are real `draw` shapes** on the canvas — built with `b64Vecs.encodePoints` and `dash: 'draw'`, so the track is genuine perfect-freehand ink, just like anything else you'd sketch on a tldraw board. Everything that moves every frame — the terrain, train, worker, and placement hint — is drawn through `OverlayUtil` subclasses straight to a canvas context in page space, which stays cheap at 60fps.

The simulation is a plain mutable object advanced on the editor's `tick` event; a `frame$` atom is bumped each tick so the overlays redraw, while a handful of value atoms feed the HUD only when they change. The camera follows the train with `editor.centerOnPoint` every tick, and `wheelBehavior: 'none'` locks the zoom so the board stays framed.
