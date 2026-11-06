---
title: Permissions in a classroom
component: ./PermissionsClassroomExample.tsx
priority: 5
keywords:
  [
    permissions,
    access control,
    authorizeRecord,
    authorizeRead,
    registerRecordRules,
    isShapeLocked,
    isPageReadonly,
    read-only,
    private pages,
    share links,
    agents,
    comments,
  ]
multiplayer: true
---

Four people share one board: a teacher, a student, a shared link, and an agent. One set of record rules decides what each of them may read and write, on the server and in each editor.

---

The example runs a `TLSocketRoom` in the browser and connects four editors to it with `useSync`. The rules in `rules.ts` use the existing room options:

- `authorizeRead` hides the private Answers page, its shapes, its comments, and the cursors on it.
- `authorizeRecord` stamps each new shape with its owner, lets students change only their own shapes and some shape types, keeps the agent inside its frame, and lets only the teacher change pages.
- `createCommentAuthorizers` lets the shared link comment on a read-only canvas, and lets the teacher take down any comment.

Each client registers the same rules on its store with `registerRecordRules`, so a denied write is canceled before it is sent. `isShapeLocked` locks the shapes that a person may not change, and `isPageReadonly` makes the Lesson page read-only for students when the teacher locks it.

Try it:

- Draw as Alice, then try to move the teacher's text. It is locked for Alice only.
- As the teacher, clear "Answers private". The page appears for the others at once.
- As the teacher, set the link to "can view". Carol reconnects and can no longer comment.
- Click "Run agent". The note inside the agent's frame is kept. The other two writes are denied.
