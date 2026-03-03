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
    TLIdentityProvider,
    RecordsDiff,
    squashRecordDiffs,
    reverseRecordsDiff,
    store.listen,
    time travel,
  ]
---

Scrub through per-user change history with identity-aware timeline attribution.

---

This example combines the identity system with a timeline scrubber to create an attribution-aware history viewer. Switch between users (Alice, Bob, Carol) using the buttons at the top, make changes as each user, then use the slider at the bottom to scrub through the timeline. Filter by user to scrub through only their changes — the canvas shows the full state at that point in history, including all other users' changes up to that moment.
