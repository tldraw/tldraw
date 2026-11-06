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

Four clients share one room that runs in the page: a teacher, two students, and a comment-only link. Each use case is something to try:

- **Shape write.** Students edit only their own shapes, and draw only in their own area. Other shapes show a lock.
- **Plugin action.** Select the teacher's note and vote. Votes are a command, so students can vote on a shape they cannot edit.
- **Comments.** Comment, then delete someone else's comment: only the author or the teacher can.
- **Live write access.** Turn off "Alice can edit". Her canvas turns read-only at once.
- **Page read.** The "Answers" page is for the teacher only. Turn on "Share answers with Alice": it appears for Alice, not for Bob. Turn it off again: it disappears.
- **File read.** Turn off "Carol has access". Her session closes at once.
- **Undo.** Undo a vote or a comment. Undo sends the inverse command.
- **Offline.** Turn off "Online" in a pane, vote and comment, then turn it on. Each command applies once.
- **Agent.** "Ask the agent" runs a session that can only add notes to the agent area.
