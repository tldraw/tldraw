---
title: Parabox
component: ./ParaboxExample.tsx
priority: 5
keywords: [game, recursion, sokoban, parabox, nesting, zoom, geo shape, puzzle, infinite]
---

A recursive-box Sokoban (Patrick's Parabox) where recursion is the primitive.

---

Push blocks onto targets — but boxes have interiors. Push a block into a box and it's now inside that box's grid; push it against an inner wall and it exits back out. The whole game is one recursive resolver in `sim.ts` where push, enter, and exit are the same code path.

The recursion lands naturally on tldraw, because nesting and infinite zoom are what the canvas already is. Each box is drawn as a real nested rectangle, the level's structure is genuine nested shapes, and the camera zooms onto the room you're standing in — so entering a box literally zooms you in. The third level has a box that contains itself: enter it and the nesting goes forever, which the canvas renders as true infinite zoom rather than a faked fixed-resolution image.

Move with <kbd>WASD</kbd> or the arrow keys, <kbd>Z</kbd> to undo, <kbd>R</kbd> to restart, and scroll to zoom in on the recursion yourself.
