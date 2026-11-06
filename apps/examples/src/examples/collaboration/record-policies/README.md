---
title: Record policies
component: ./RecordPoliciesExample.tsx
priority: 5
keywords:
  [permissions, policies, access control, classroom, ownership, read access, private page, setActor]
---

One set of access rules for each record type, enforced in the editor and on the sync server.

---

Three editors share one sync room that runs in the browser. The teacher changes anything. Students add shapes and change only their own, and they cannot see the private "Answers" page.

The rules live in `classroom.ts` as `policies` for the `shape`, `page`, and `binding` record types. The editors and the room both put them in their schema, and each editor calls `editor.setActor` with the same actor that the room gets from `getActor`. Turn off "Check locally" in a student pane to see the server reject changes on its own.
