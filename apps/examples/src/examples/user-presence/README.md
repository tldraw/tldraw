---
title: Manually update user presence
component: ./UserPresenceExample.tsx
category: collaboration
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
priority: 5
---

Manually show other users editing the same document.

---

Here, we add fake `InstancePresence` records to the store to simulate other users. If you have your own presence system, you could add real records to the store in the same way.
