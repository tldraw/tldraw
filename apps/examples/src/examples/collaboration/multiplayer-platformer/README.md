---
title: Multiplayer platformer
component: ./MultiplayerPlatformerExample.tsx
priority: 6
keywords: [game, platformer, physics, gravity, collision, jump, keyboard, sync, multiplayer]
multiplayer: true
---

Turn the canvas into a shared 2D platformer where every collaborator drives their own player.

---

The canvas becomes a side-scrolling platformer level. Each collaborator gets a player they control with the arrow keys or WASD, and space to jump. Open the example in two windows (or share the room link) to play together.

Everything in the level — the floor, platforms, crates, and the player characters themselves — is an ordinary tldraw shape. You can select, drag, resize, and delete any of it while the game runs, so you can rebuild the level under your own feet.

This example shows how to:

- Define a custom `player` shape that's still a normal, movable shape via `BaseBoxShapeUtil`.
- Run a per-frame game loop on the editor's `tick` event, applying gravity and axis-aligned collision detection.
- Read keyboard input without breaking tldraw's own shortcuts, by marking the game keys as handled before the editor sees them (space, the arrow keys, and W/A/S/D all have default behaviors otherwise).
- Combine custom physics with `useSyncDemo`: each client simulates only its own player and writes its position to the store, while everyone else's players arrive over sync.
- Despawn a collaborator's player when they leave, by reconciling player shapes against `editor.getCollaborators()` (with a short grace period so brief disconnects don't remove a player that's about to reappear).

Position updates use `history: 'ignore'` so the simulation doesn't fill the undo stack, and a player at rest stops emitting updates so an idle game produces no sync traffic.
