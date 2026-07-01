---
title: Cursor spaceship
component: ./CursorSpaceshipExample.tsx
category: use-cases
priority: 3
keywords:
  [
    game,
    space,
    asteroids,
    spaceship,
    camera,
    collision,
    cursor,
    pointer,
    current,
    multiplayer,
    sync,
  ]
multiplayer: true
---

A multiplayer space drift where your cursor is the ship — a current carries you through an endless asteroid field, and you steer to weave through the rocks.

---

Like the cursor maze, the OS cursor can't be given collision, so the game inverts the usual relationship between the cursor and the canvas: the ship is pinned directly under the pointer, and the camera moves to keep it there. Push into a rock and the ship can't advance, so the camera makes up the difference — the whole field scrolls and the ship appears to skim the rock, right under your pointer.

The one new idea on top of the maze is the **current**. Every tick, on top of wherever you steer, the current pushes the ship forward a little. Because the camera stays pinned to the ship, that push scrolls the world by itself — so you're always flying, even holding still. And because a player's synced cursor _is_ their world position, the same event reads two ways: on your screen the field scrolls past you; on everyone else's, your ship flies through it. Mechanically it's the maze's collision-camera plus a constant push.

To steer, you move the cursor; your net motion is your cursor movement plus the current. Hold still and the current flies you on; swim against it and you can slow or reverse; bump a rock and you slide around its edge (the world stops advancing until you clear it). Collision is resolved as a substepped sweep that pushes the ship out along each rock's surface normal, so it skims rather than sticks.

The asteroid field and starfield are **generated on the fly from the room id**: each cell of space independently decides, via a hash, whether it holds a rock and how big — so the field is endless in every direction and identical for everyone in the room, with no shape data synced. Only the cells overlapping the current viewport are ever generated, so flying forever stays cheap. The field and stars are painted to a canvas on the `Background` layer (behind the cursors); the ships are tldraw's own cursors, which pan with each viewer's camera automatically.

The camera is locked with `isLocked: true` so nothing but the game can move it; the game's own `setCamera` calls pass `{ force: true }` to bypass the lock. Each ship also leaves a tapering engine-exhaust trail in that player's color — a pure local effect drawn from the cursor positions tldraw already gives us, so it adds nothing to what's synced.
