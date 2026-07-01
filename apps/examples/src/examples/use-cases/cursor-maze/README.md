---
title: Cursor maze
component: ./CursorMazeExample.tsx
category: use-cases
priority: 3
keywords: [game, maze, labyrinth, camera, collision, cursor, pointer, multiplayer, sync]
multiplayer: true
---

A multiplayer maze where your cursor is the player — push into a wall and the camera pans instead of letting you through.

---

The OS cursor can't be given collision, so this game inverts the usual relationship between the cursor and the canvas. The player is pinned directly under the pointer, and its position in the world is tracked separately. On every tick:

- the player's target is the world point under the cursor,
- collision against the maze walls is resolved with an axis-separated sweep, so the player slides along walls instead of sticking,
- the camera is moved so the resolved player position lands back under the cursor.

When you push into a wall the player can't advance, so the camera makes up the difference: the whole maze scrolls and the player appears stuck against the wall, right under your pointer. The maze is larger than the viewport, so this is also how you get around — you bring new parts into view by pushing against walls as you go.

The camera moves _only_ as a result of a collision — a genuine consequence of where the player is. It never scrolls just because the cursor neared a screen edge, which would depend on each viewer's screen rather than on the shared maze. Clicking **Start** drops you in at a fixed start, which slides under your cursor — the game chooses where you begin, not wherever the pointer happened to be.

Because the player is always exactly the world point under the cursor, it _is_ the cursor — there's no avatar to draw. That's what makes it multiplayer for free: the room is connected with `useSyncDemo`, and every player's cursor is synced presence. Each client runs its own collision loop and owns its own camera (camera is session-local, never synced), so pinning the player under the cursor keeps the synced cursor on the collision-resolved maze position — other players show up as their own cursors threading the same maze, and because the maze is larger than the screen, tldraw draws an edge hint pointing toward anyone currently outside your view. The maze itself is seeded from the room id, so everyone carves an identical one without syncing any shape data. (It's also why the camera can't keep the player centered: the player sits wherever the mouse physically is, and the camera can only change what's behind it.)

The camera is locked with `isLocked: true` so nothing but the game can move it; the game's own `setCamera` calls pass `{ force: true }` to bypass the lock. Only the walls and the exit are drawn in world space through the `OnTheCanvas` component — the players are tldraw's own cursors, which pan with each viewer's camera automatically.

The scoreboard is persistent without any custom backend. A clock starts when you spawn, and reaching the exit writes `{ name, color, timeMs }` into the synced document's `meta` (`editor.updateDocumentSettings`), keyed by user id. Unlike presence, the document is persisted by the sync server, so scores outlive disconnects and load for anyone who joins the room later. The scoreboard just reads `editor.getDocumentSettings().meta.scores` reactively and sorts by time. (Writes are last-write-wins on the single document record, which is fine for the occasional maze completion.)
