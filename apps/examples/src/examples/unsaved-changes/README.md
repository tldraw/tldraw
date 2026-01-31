---
title: Unsaved changes
component: ./UnsavedChangesExample.tsx
category: events
keywords:
  [
    save,
    unsaved changes,
    document changes,
    store.listen,
    document scope,
    RecordsDiff,
    squashRecordDiffs,
    persistence,
    dirty state,
    getSnapshot,
  ]
---

Track unsaved changes and enable save functionality.

---

This example shows how to track when the document has unsaved changes by listening to document scope events. A save button is enabled only when there are unsaved changes, and clicking it clears the unsaved state. The example uses `Editor.store.listen` with the `document` scope to monitor changes to the tldraw document.
