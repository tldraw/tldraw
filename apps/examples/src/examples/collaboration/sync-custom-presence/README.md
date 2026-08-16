---
title: Multiplayer sync with custom presence
component: ./SyncCustomPresence.tsx
priority: 3
keywords:
  [
    multiplayer,
    collaboration,
    presence,
    custom data,
    sync,
    tlinstancepresence,
    user state,
    real-time,
  ]
multiplayer: true
---

Change the presence data synced to other users with `getUserPresence`.

---

Presence is the per-user state (cursor, camera, selection, chat message) that sync broadcasts to every other client. Pass `getUserPresence` to `useSyncDemo` (or `useSync`) to control what is sent: start from `getDefaultUserPresence`, then remove fields you don't want shared or change them.

This example drops the camera, so other users can't follow this viewport, and makes the cursor orbit its real position. Open the example in two tabs to see the effect.
