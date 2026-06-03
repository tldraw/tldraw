---
title: Table multiplayer
component: ./TableMultiplayerExample.tsx
priority: 4
keywords: [table, multiplayer, sync, collaboration, realtime]
---

Multiple users edit a table at the same time, consistent with the rest of the canvas.

---

Tables sync like any other tldraw shape. Open this example in two tabs and edit
together: typing in *different* cells never conflicts, because each non-empty
cell is its own record. Editing the same cell, or a structural change, resolves
last-writer-wins — the same behaviour as the rest of the canvas. This uses the
demo sync server via `useSyncDemo`.
