---
title: Commenting
component: ./CommentingExample.tsx
priority: 1
keywords: [comments, commenting, comment thread, annotations, feedback, review, collaboration, pins]
---

Add comments to the canvas with the commenting toolkit.

---

Comment threads are records in the editor's store, so they persist and sync exactly like shapes. Register `commentSchemaRecords` on the schema, then render `CanvasComments` in front of the canvas.

Press `c` or pick the comment tool, then click anywhere to start a thread, or click a shape to attach one to it. Type `@` in a composer to mention someone.
