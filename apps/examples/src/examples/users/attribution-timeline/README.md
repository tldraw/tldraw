---
title: Attribution timeline
component: ./AttributionTimelineExample.tsx
priority: 7
keywords:
  [
    attribution,
    identity,
    timeline,
    history,
    user,
    TLUserStore,
    RecordsDiff,
    squashRecordDiffs,
    reverseRecordsDiff,
    store.listen,
    time travel,
  ]
---

Record every store change with the user who made it, then scrub through history globally or per user.

---

A `TLUserStore` tells the editor who is current. This example listens to the store with `store.listen({ scope: 'document', source: 'user' })`, tags each `RecordsDiff` with that user, and builds two kinds of scrubber from the log: an "All" slider that walks the full chronological history, and one slider per user that applies or reverts only that user's changes while everyone else's stay on the canvas. Scrubbing replays diffs with `squashRecordDiffs`, `reverseRecordsDiff`, and `store.applyDiff`, wrapped in `mergeRemoteChanges` so the replay isn't itself recorded.

Switch between Alice, Bob, and Carol with the buttons at the top, draw something as each, then drag the sliders at the bottom. The "All" count is always the sum of the per-user counts.
