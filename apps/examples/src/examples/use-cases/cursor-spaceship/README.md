---
title: Cursor spaceship
component: ./CursorSpaceshipExample.tsx
category: use-cases
priority: 3
keywords:
  [
    game,
    space,
    sun,
    orbit,
    gravity,
    asteroids,
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

A multiplayer orbital survival where your cursor is the ship — a current sweeps you around a sun, and you steer to hold your ring between the star and an asteroid belt.

---

Like the cursor maze, the OS cursor can't be given collision, so the game inverts the usual relationship between the cursor and the canvas: the ship is pinned directly under the pointer, and the camera moves to keep it there. Push against the asteroid belt and the ship can't advance, so the camera makes up the difference — the whole field scrolls and the ship slides along the belt, right under your pointer.

The force that carries you is a **current** — but here it's not a straight push, it's tangential: it sweeps every ship in a slow circle around the sun. On top of it, the sun's **gravity** pulls you inward — a gentle nudge out in the ring, an inescapable yank once you're close. So holding the cursor still isn't standing still: the current orbits you while gravity eats your altitude, and you steer outward to hold your ring. Fall inside the sun and you're gone.

Because a player's synced cursor _is_ their world position, the same event reads two ways: on your screen the star field scrolls past as you orbit; on everyone else's, your ship swings around the sun. And because everyone is bound to the **same** sun in the **same** ring, the arena is small and shared — you're always crossing paths, which an endless open field could never give you. The asteroid belt is the outer wall: it caps how far out you can orbit, so you can't just retreat to empty space.

The belt and star field are **generated on the fly from the room id** — each cell of space independently decides, via a hash, whether it holds a rock — so the arena is identical for everyone in the room with no shape data synced, and only the cells overlapping the viewport are ever generated. The sun, belt, and stars are painted to a canvas on the `Background` layer (behind the cursors); the ships are tldraw's own cursors, which pan with each viewer's camera automatically.

The camera is locked with `isLocked: true` so nothing but the game can move it; the game's own `setCamera` calls pass `{ force: true }` to bypass the lock. Each ship also leaves a tapering engine-exhaust trail in that player's color — a pure local effect drawn from the cursor positions tldraw already gives us, so it adds nothing to what's synced.
