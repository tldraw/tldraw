---
title: Comment notifications
component: ./CommentNotificationsExample.tsx
priority: 9
keywords:
  [
    comments,
    commenting,
    notifications,
    desktop notifications,
    inbox,
    unread,
    read receipts,
    mentions,
    collaboration,
  ]
---

Track unread comments, build a notifications feed, and send desktop notifications.

---

The commenting layer takes read state from the host: `isCommentUnread` reports it, `onCommentsRead` records receipts for the unread comments a thread view displays, and `revealThread` jumps to a thread from anywhere outside the canvas.

`getStoreCommentNotifications` derives the feed from the comment records, tagging each one with why it concerns you — a mention, a reply in your thread, a reaction to your comment — and checking it against your read state. `startCommentNotifier` turns the same feed into desktop notifications while the window is out of focus.

Pick a desktop notification level, use the buttons to post as another user, and switch to another window before the five seconds are up. Click a row or the notification to jump to the thread and watch it mark itself read.
