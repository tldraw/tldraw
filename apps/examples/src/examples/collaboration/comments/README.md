---
title: Comments
component: ./CommentsExample.tsx
category: collaboration
keywords: [comment, comments, thread, annotation, pin, feedback, figma, review]
---

Add Figma-like pinned comment threads to the canvas.

---

This example builds a commenting system on top of tldraw's custom records, using a
real toolbar tool and tldraw's own design tokens so it matches the editor in light
and dark mode. Pick the comment tool from the toolbar (or press C), then click the
canvas to drop a pin and start a thread. Pins stick to their point in page space as
you pan and zoom. Hover a pin to preview it, click to open the thread, then reply,
resolve (with undo), or delete.

Comments are stored as document-scoped custom records, so they persist and sync
through the same pipeline as shapes. Drop this store into a synced store and the
comments become multiplayer automatically.
