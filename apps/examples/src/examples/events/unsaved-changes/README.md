---
title: Unsaved changes
component: ./UnsavedChangesExample.tsx
priority: 8
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

Track unsaved document changes as a squashed diff and enable a save button while there are any.

---

This example listens to the store with `editor.store.listen(handler, { scope: 'document' })`, so
only changes to persisted document records count, not the camera or selection. Each transaction's
diff is folded into a running `RecordsDiff` with `squashRecordDiffs`, so a shape that's created and
then deleted cancels out and repeated edits collapse into one. The save button in the top panel is
enabled while that diff is non-empty.

Try drawing something: the button lights up. Delete what you drew and it goes back to "No changes",
because the squashed diff is empty again. Clicking save hands the diff and a snapshot from
`editor.getSnapshot()` to a placeholder function and resets the diff.
