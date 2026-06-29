---
title: Multiplayer 3D shooter
component: ./Engine3DMultiplayerExample.tsx
priority: 4
multiplayer: true
keywords: [game, raycasting, doom, 3d, fps, shooter, multiplayer, sync, tick, geometry, shapes]
---

A first-person multiplayer deathmatch where the world and the rendered view are real tldraw shapes.

---

This is the multiplayer sibling of the "3D engine made of shapes" example. It keeps
that example's trick — the projected first-person view is built from genuine tldraw
rectangles, no canvas and no WebGL — and turns it into a small shooter using tldraw
sync. Open it in two tabs (use **Copy link** to share the room) to play against
yourself.

The state is deliberately split across two stores:

- **The shared map** (left) is a synced editor (`useSyncDemo`). Walls are ordinary
  geo shapes, so drawing, dragging, or recolouring one is multiplayer for free —
  every player's raycaster reads the change on the next tick. This is the only
  synced document.
- **The 3D view** (right) is a separate, _local_ editor. Its column rectangles and
  the whole HUD (crosshair, health bar, scoreboard) are rewritten every frame inside
  `editor.run(fn, { history: 'ignore' })`. Keeping it local means the per-frame churn
  never touches the network or collides with other players' views.

Players are shapes too. Each client owns one locked ellipse on the map (plus a small
"nose" for facing) whose `meta` carries its whole game state — position, health,
hits, and last shot. Peers read that straight off the shape, so no presence or custom
messages are needed; a client prunes any player shapes that haven't updated for a few
seconds, which cleans up after someone leaves.

Other players appear in the 3D view as **characters**, not walls: each peer becomes a
billboard fed into a second ray-cast pass, drawn on top of the wall behind it,
shorter than a wall, standing on the floor, with a rounded silhouette and a bobbing
hop. When you fire, you also send a tiny circle **bullet** shape streaking across the
shared map — and every bullet is projected into the 3D view as a dot that shrinks
with distance and is hidden behind walls. Damage is resolved instantly: each peer
notices your new shot, tests it against its own position, and applies the hit — both
sides run the same maths.

Move with **WASD**, turn with the **arrow keys**, and hold **space** to shoot. Draw a
rectangle on the left map to drop a new wall everyone can immediately use as cover.
