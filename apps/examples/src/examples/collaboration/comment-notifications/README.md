---
title: Comment notifications
component: ./CommentNotificationsExample.tsx
priority: 9
keywords:
  [comments, commenting, notifications, inbox, unread, read receipts, mentions, collaboration]
---

Track unread comments and build a notifications feed.

---

The commenting layer doesn't decide what's unread or what's worth notifying someone about — it takes both from the host. `isCommentUnread` reports read status, `onCommentsRead` records receipts for the unread comments a thread view displays, and `revealThread` jumps to a thread from anywhere outside the canvas.

That's enough to build a feed: derive it from the comment records with `useComments`, tag each one with why it's there, and check it against your read state. This example uses two reasons — the comment mentions you, or it lands in a thread you're part of.

Use the buttons to post as another user, then click a row to jump to the thread and watch it mark itself read.
