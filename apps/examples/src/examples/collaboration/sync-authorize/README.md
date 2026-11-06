---
title: Multiplayer sync with permission rules
component: ./SyncAuthorizeExample.tsx
priority: 4
keywords:
  [
    multiplayer,
    comments,
    sync,
    permissions,
    authorize,
    access control,
    roles,
    read control,
    write control,
    ownership,
    share link,
    agent,
  ]
---

Control who can see and change what with one `authorize` function, on the sync server and in the editor.

---

Three clients share one sync room in this page. One `authorize` function answers every question: may this user read this record, create it, update it, delete it, or do a custom action such as `cards:reveal` or `tool:draw`. The room runs it for every read and write. Each editor runs it too, through the `permissions` prop, to show the right tools, to make other users' shapes act locked, and to revert a denied write at once.

The top bar is a guided walkthrough with one step per use case: a view-only share link, team pages, a locked page, shapes that only their owner can change, hidden cards (a plugin type with a custom action), comments, an agent that writes only inside its frame, and pushes that the room applies in part. Each step sets the user of each panel, says which rule in `classroom.ts` answers the use case, and lists what to try.

Turn off "Editor checks" in a panel to see what the room alone enforces. The editor then sends every write, and the room corrects it and sends back the reason.
