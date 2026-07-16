---
title: Commenting
component: ./CommentingExample.tsx
priority: 1
keywords: [comments, commenting, comment thread, annotations, feedback, review, collaboration, pins]
---

Add comments to the canvas with the commenting toolkit.

---

The `@tldraw/commenting` package adds a commenting layer on top of the tldraw editor. Select the comment tool from the toolbar (or press `c`), then click anywhere to start a thread, drag out a rectangle to comment on a region, or click a shape to attach a comment to it. Each thread shows as a pin you can reopen, reply to, resolve, or delete. Type `@` in a composer to mention someone from the roster.

Comments are stored as `comment-thread` and `comment` records in the editor's own store. You register those record types by passing `commentSchemaRecords` to the schema, then render `CanvasComments` in front of the canvas — it reads the records reactively and draws the pins, threads, and composer. Because comments live in the store, they persist and sync exactly like shapes: this example runs entirely in-memory, but adding a `persistenceKey` or a sync backend would carry the comments along for free.

`CanvasComments` takes a `currentUserId` (the signed-in user, or `null` for a read-only viewer) and a `resolveName` function that maps author ids to display names. The optional props here enable more of the toolkit: `regionOptions={{ enabled: true }}` turns on drag-to-comment regions, and `getMentionSuggestions` supplies the `@`-mention roster.
