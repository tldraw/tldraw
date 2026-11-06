---
title: Relation-based permissions
component: ./RelationPermissionsExample.tsx
priority: 5
keywords:
  [
    multiplayer,
    sync,
    permissions,
    access control,
    relations,
    zanzibar,
    rebac,
    roles,
    share links,
    agents,
    capability tokens,
    private pages,
  ]
multiplayer: true
---

Control who can read and write each file, page, and shape with relation tuples and one schema that the server and the editor both run.

---

Each tab runs a sync room in the browser, with the relation access layer, and connects one editor per person. Every person sees only what the server sends them, and every write they make goes through the same checks that the server runs. Use the buttons to change grants: each one writes or deletes one tuple, and every open session updates without a reconnect. The server log shows grants, revocations, and denied pushes.

- **File roles**: owner, editor, and viewer as tuples on the file.
- **Classroom**: students add shapes only in their own area and change only their own shapes. The teacher can open the board, call on a student, or restrict shape types.
- **Private pages**: pages hidden from some people never reach their clients.
- **Links and agents**: a share link for one page, and an agent token narrowed to one frame.
- **Reveal and cards**: a hidden step and per-player cards, revealed with one tuple.
