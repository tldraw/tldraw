---
title: Unsaved changes 2
component: ./UnsavedChangesExample2.tsx
category: events
keywords: [save, unsaved, changes, document, listen, state]
---

Track unsaved changes and enable save functionality.

---

This example shows how to track when the document has unsaved changes by listening to document scope events and diffing the editor's snapshot against the last saved snapshot. This is a more expensive way to track unsaved changes, but it is more accurate.
