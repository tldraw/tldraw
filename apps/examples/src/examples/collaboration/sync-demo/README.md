---
title: Multiplayer sync
component: ./SyncDemoExample.tsx
priority: 1
keywords: [multiplayer, sync, useSyncDemo, collaboration, real-time, websocket, co-editing]
multiplayer: true
---

Connect to a shared room with `useSyncDemo` for instant multiplayer.

---

`useSyncDemo` returns a store connected to a demo sync backend that tldraw hosts, so you can prototype multiplayer without running a server. Pass the store to `<Tldraw>` and every client with the same `roomId` edits the same document. Data on the demo server is wiped after one day.

Open the example in two tabs to see cursors and edits sync. For a self-hosted backend, see the `useSync` hook in `@tldraw/sync` and the sync template.
