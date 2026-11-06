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
    share links,
    comments,
    private,
    offline,
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

This example runs the room in the browser and shows several users side by side, one pane each. Pick a scenario and follow its "Try this" steps:

- Roles and share links: a viewer, a commenter, and an editor, and a link that is revoked live.
- Classroom: students change only their own shapes.
- Private shapes: `canRead` keeps a shape from ever reaching other users.
- Pages: a locked page, and a hidden page with everything on it.
- Offline: changes made offline are checked one by one on reconnect, and only the denied ones are dropped.
- Agent: an agent that can only work inside its frame.
- Poll plugin: a plugin with its own records and a server-run action.

Change a pane's role to change its access live, or take a pane offline. Each pane lists the changes that its editor or the server denied, and why.
