---
title: Permissions as a middleware chain
component: ./PermissionChainExample.tsx
priority: 5
keywords:
  [
    permissions,
    access control,
    middleware,
    multiplayer,
    sync,
    classroom,
    read only,
    private pages,
    ownership,
    agents,
  ]
multiplayer: true
---

One permission chain enforces a classroom in a sync room and in each editor.

---

The chain is an ordered list of layers. Each layer sees a whole batch (all writes of one editor operation or one push, or all records one session is about to receive) and can allow, deny, change, or pass it on. The same chain runs in the room, which enforces it, and in each editor, which stops a denied write before it is sent.

The rules: a teacher can do anything. Students change only their own shapes, cannot put shapes into someone else's frame, cannot change pages, and cannot draw on a locked page. A private page, and all that is on it, is for teachers only. When the class is closed, only teachers can open the file. A student reads only their own grade. Comments are posted as yourself, and only the author or a teacher removes one. A share-link guest gets the link's role, which can change while they are connected. A viewer writes nothing. An agent works only inside its frame, with at most 50 writes per batch.

The panel on the right lists each use case, the layers that solve it, and the steps to see it.
