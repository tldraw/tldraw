---
title: Permissions on the server
component: ./PermissionsServerExample.tsx
priority: 21
keywords: [permissions, checkDiff, server, sync, TLSocketRoom, classroom]
---

Let a sync room reject changes, with a diff check on the server.

---

The room runs `checkDiff` on each push. It sees which user sent the push and the state before the push. If it rejects, the room stores nothing, and the client reverts the whole push and emits `'rejected'`.

In this example, the room runs in the browser, so that you can try it without a server. In your app, the same `TLSocketRoom` options go on your server. See `templates/simple-server-example` for a Node server.

The teacher can change everything. A student can change shapes only on the page that has the student's name. Draw as `sam` on Page 1, then on the page `sam`.
