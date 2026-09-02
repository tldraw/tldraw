---
title: Commenting
component: ./CommentingExample.tsx
priority: 1
keywords: [comments, commenting, comment thread, annotations, feedback, review, collaboration, pins]
---

Add comment threads to the canvas with the commenting toolkit.

---

Comment threads are records in the editor's store, so they persist and sync exactly like shapes. Register `commentSchemaRecords` on the schema, add `CommentTool` and `commentToolOverrides` to the editor, then render `CanvasComments` in the `InFrontOfTheCanvas` slot. That is the whole integration.

Press `c` or pick the comment tool, then click anywhere to start a thread, click a shape to attach one to it, or drag to comment on a region (turned on here with `CommentTool.configure({ enableRegions: true })`). Type `@` in a composer to mention someone; the suggestions come from `getMentionSuggestions`.

Commenting is a licensed feature. Everything works in local development, but a deployed app needs a license key that includes commenting.
