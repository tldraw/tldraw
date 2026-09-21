---
title: Comments and undo
component: ./CommentHistoryExample.tsx
priority: 6
keywords: [comments, commenting, history, undo, redo, dragHistory, multiplayer, collaboration]
---

Decide whether comment writes land on the editor's undo stack.

---

`CommentingOptions.history` governs every comment write — posting, replying, editing, resolving, deleting — and defaults to `'ignore'`. In a shared document an undoable delete would resurrect a thread a collaborator already removed.

Pin drags are the exception, since re-anchoring may reasonably undo alongside a shape move. `dragHistory` overrides `history` for drags alone.

Move the shape, post a comment, drag its pin, then press undo and watch the counts.
