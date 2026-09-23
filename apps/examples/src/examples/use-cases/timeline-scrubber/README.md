---
title: Timeline scrubber
component: ./TimelineScrubberExample.tsx
priority: 10
keywords:
  [
    timeline,
    history,
    undo,
    redo,
    time travel,
    scrubber,
    store.listen,
    RecordsDiff,
    squashRecordDiffs,
    reverseRecordsDiff,
    applyDiff,
    document changes,
  ]
---

Record every document change as a diff and scrub back and forth through the history with a slider.

---

`editor.store.listen` (scoped to `document` changes from the `user` source) captures a `RecordsDiff` for every edit. Dragging the slider collects the diffs between the current and target positions, squashes them with `squashRecordDiffs`, reverses them with `reverseRecordsDiff` when going backwards, and applies the result with `store.applyDiff` inside `store.mergeRemoteChanges` so the listener does not record the time travel itself.

Try drawing a few shapes, then drag the slider back. Make a change while scrubbed back and the later entries are discarded, starting a new branch from that point.
