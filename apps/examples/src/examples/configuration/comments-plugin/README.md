---
title: Comments plugin
component: ./CommentsPluginExample.tsx
category: configuration
priority: 3
keywords: [comments, plugin, threads, annotations]
---

Add commenting to the editor with the comments plugin.

---

The `@tldraw/comments` package adds comment threads to the canvas as a plugin. Select a shape to
start a thread. Comments are stored as custom records in the document, so with local persistence
they survive reloads; with tldraw sync they sync to other clients when the client passes the
plugin to `useSync` and the server registers the matching `commentsSyncPlugin`.
