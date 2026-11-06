---
title: Permissions
component: ./SyncPermissionsExample.tsx
priority: 6
keywords:
  [
    multiplayer,
    sync,
    permissions,
    access,
    roles,
    read-only,
    ownership,
    pages,
    agents,
    plugins,
    definePermissions,
    TLSocketRoom,
  ]
---

Control who can see and change what, with one set of rules on the client and the server.

---

`definePermissions` describes what each session may do. Rules check every change as one transaction, `canRead` hides records, and mutators are actions that the server runs itself. Pass the same object to `TLSocketRoom` on the server and to `useSync` on the client: the editor denies a change at once, and the server checks it again.

This example runs the room in the browser and shows several users side by side. Pick a scenario: a classroom where students edit only their own shapes, pages that are locked or hidden, an agent that can only work in its frame, and a poll plugin with its own records and action. Change a pane's role to change its access live.
