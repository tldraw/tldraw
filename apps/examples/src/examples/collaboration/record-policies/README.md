---
title: Record policies
component: ./RecordPoliciesExample.tsx
priority: 5
keywords:
  [
    permissions,
    policies,
    access control,
    classroom,
    ownership,
    read access,
    private page,
    share link,
    comments,
    agent,
    plugin,
    setActor,
  ]
---

One set of access rules for each record type, enforced in the editor and on the sync server.

---

Each tab is one use case: a classroom, share links, edit access per page, comments, an agent area, and plugin types. Three editors share one sync room that runs in the browser, each as a different person.

Each scenario file holds its rules as `policies`. The editors and the room both put them in their schema, together with the rules that record types (comments, votes) and shape utils (stickers) bring. Each editor calls `editor.setActor` with the same actor that the room gets from `getActor`. Turn off "Check locally" in a pane to see the server reject changes on its own.

Read access needs few rules. In the classroom, only the page has a `read` rule: shapes follow their page, and arrows follow the shapes they join. When the teacher gives students access to the Answers page, the example calls `room.refreshAccess()`, and the students' panes get the page without a reconnect.
