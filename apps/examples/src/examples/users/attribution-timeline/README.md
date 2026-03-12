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
    tlmeta,
    createdBy,
    updatedBy,
    TLUserStore,
    RecordsDiff,
    squashRecordDiffs,
    reverseRecordsDiff,
    store.listen,
    time travel,
  ]
---

Scrub through per-user change history with identity-aware timeline attribution.

---

This example combines the user store with a timeline scrubber to create an attribution-aware history viewer. Switch between users (Alice, Bob, Carol) using the buttons at the top, make changes as each user, then use the slider at the bottom to scrub through the timeline. In "All" mode the slider navigates the full global history. Filter by a user to selectively remove or restore only that user's changes — other users' shapes stay on canvas while you scrub.
