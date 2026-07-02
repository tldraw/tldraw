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
    fuel,
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

A multiplayer orbital survival where your cursor is the ship — a current sweeps you around a sun; hold your ring, race others for fuel, ram slower ships, and don't touch the star or the belt.

---

Like the cursor maze, the OS cursor can't be given collision, so the game inverts the usual relationship between the cursor and the canvas: the ship is pinned directly under the pointer, and the camera moves to keep it there. Your cursor _is_ the ship — there's no avatar to draw or sync — and the only things actually rendered are the world (sun, belt, stars, fuel) and a trail; the camera just scrolls the world beneath your pointer.

The force that carries you is a **current** — not a straight push, but tangential: it sweeps every ship in a slow circle around a central sun. On top of it, the sun's **gravity** pulls you inward — a gentle nudge out in the ring, an inescapable yank once you're close. So holding the cursor still isn't standing still: the current orbits you while gravity eats your altitude, and you steer outward to hold your ring. Because a player's synced cursor _is_ their world position, the same event reads two ways — on your screen the star field scrolls past as you orbit, on everyone else's your ship swings around the sun — and because everyone is bound to the same sun in the same ring, the arena is small and shared, so you're always crossing paths.

Three things end a run. The **sun** is lethal at its core; drift inside and you respawn out in the ring. The **asteroid belt** is a lethal outer wall — touch a rock (or slip past it) and you're gone — so it caps how far out you can orbit and you can't just retreat to empty space. And **another player**: because every ship _is_ a cursor, flying into one is a collision, and the faster ship wins the joust — ram someone slower and they're destroyed, get caught moving slower than an incoming ship and you are. Each client settles that for itself from the synced cursors — your exact speed against a neighbour's, estimated from how fast theirs is moving — so the slower ship goes down on its own screen with nothing extra sent.

Your **engines burn fuel** too — faster the deeper you sit in the well — and it drains as you fly; you refill by scooping the fuel cells scattered through the ring. A cell counts as taken the moment _any_ ship reaches it (again read straight off the synced cursors, so nothing new is synced), which means the whole room competes for one shared supply. Run dry and the engines cut out — **steering dies and the sun drags you in**. The cursor is still the ship the whole time; it just loses control, and the world scrolls the star in to swallow you. The cursor-is-the-player constraint holds even through death.

The belt, star field, and fuel cells are **generated on the fly from the room id** — each cell of space independently decides, via a hash, what it holds — so the arena is identical for everyone in the room with no shape data synced, and only the cells overlapping the viewport are ever generated. The sun, belt, stars, and fuel are painted to a canvas on the `Background` layer (behind the cursors); the ships are tldraw's own cursors, which pan with each viewer's camera automatically.

The camera is locked with `isLocked: true` so nothing but the game can move it; the game's own `setCamera` calls pass `{ force: true }` to bypass the lock. Each ship also leaves a tapering engine-exhaust trail in that player's color — a pure local effect drawn from the cursor positions tldraw already gives us, so it adds nothing to what's synced.
