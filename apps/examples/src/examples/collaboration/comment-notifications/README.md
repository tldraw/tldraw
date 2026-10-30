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

Track unread comments, mute threads, build a notifications feed, and send desktop notifications.

---

The commenting layer takes read state and muted threads from the host: `isCommentUnread` and `onCommentsRead` handle read receipts, `isThreadMuted` and `onThreadMutedChange` add Mute thread to each thread's menu, and `revealThread` jumps to a thread from anywhere outside the canvas.

`getStoreCommentNotifications` derives a feed from the comment records, tagging each one with why it concerns you: a mention, a reply in your thread, or a reaction to your comment. Pass `desktopNotifications` to `CanvasComments` and the same feed becomes system notifications while you're looking elsewhere. A muted thread only lets mentions through.

Pick a desktop notification level, then use the buttons to post as another user. Mute a thread from its ⋯ menu and post again to see it go quiet. Click a row or a notification to jump to the thread and watch it mark itself read.
