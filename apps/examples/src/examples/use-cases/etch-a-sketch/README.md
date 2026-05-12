---
title: Etch-a-sketch
component: ./EtchASketchExample.tsx
priority: 6
keywords: [overlay, overlayutil, canvas, drag, knob, hit testing, react]
---

A toy etch-a-sketch floating over the canvas — turn the knobs or hold WASD/arrows to draw, drag the body to move it, shake it to erase.

---

The whole device renders into a single `OverlayUtil` that paints into a Canvas 2D context, with separate overlay instances for the knobs, the body, and a corner resize handle so each one gets its own hit geometry. Within a util, hit testing walks overlays in array order, so the smaller targets (knobs, handle) come before the body's full-device rect and win the first match.

A `react()` effect in the util's constructor watches the active interaction along with `editor.inputs.getIsPointing()` and `editor.inputs.getCurrentPagePoint()`. Knob drags translate angular pointer motion around the knob's center into stylus travel along one axis (X for the left knob, Y for the right). Body drags move the device and run a sliding-window reversal counter on the pointer's X coordinate — three direction flips within 450ms clears the drawing. Resize-handle drags update the size atom, and the path is stored in normalized 0–1 coordinates so the drawing survives any resize.

The util also subscribes to the editor's `tick` event and reads held keys from `editor.inputs.keys` each frame. WASD and the arrow keys combine additively, so pressing both W and D produces a normalized diagonal at the same speed as cardinal motion. Each axis's contribution is reflected back into the matching knob's rotation, so the visual feedback is consistent whether the player is using the mouse or the keyboard.
