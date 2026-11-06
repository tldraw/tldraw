---
title: Command permissions
component: ./CommandPermissionsExample.tsx
priority: 5
keywords:
  [
    multiplayer,
    sync,
    permissions,
    commands,
    roles,
    classroom,
    ownership,
    comments,
    agent,
    read-only,
  ]
---

Authorize named commands on the sync server, and edit shapes only where a shared policy allows.

---

Four clients share one room that runs in the page: a teacher, two students, and a comment-only link. Students edit only their own shapes and draw only in their own area. Anyone with the right permission can vote, comment, or (as the teacher) add pages and ask an agent for ideas. Each of these is a named command that the server runs again with the session's trusted actor. Turn off "Alice can edit" to change her access while she is connected.
