---
title: Manually update user presence
component: ./UserPresenceExample.tsx
priority: 5
keywords:
  [
    presence,
    cursors,
    InstancePresenceRecordType,
    collaboration cursors,
    fake users,
    cursor position,
    chat message,
    cursor animation,
    mergeRemoteChanges,
  ]
---

Show another user's cursor and chat bubble by writing an `instance_presence` record to the store.

---

Collaborator cursors, names, and chat messages are rendered from `instance_presence` records. This example creates one for a fake peer with `InstancePresenceRecordType.create`, writes it inside `store.mergeRemoteChanges`, and updates its cursor and `lastActivityTimestamp` every frame so the cursor stays visible and moves in a circle.

If you have your own presence system, you can write real records the same way. For a full multiplayer setup, see the sync examples.
