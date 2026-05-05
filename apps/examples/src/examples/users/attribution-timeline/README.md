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

Scrub the global timeline or each user's edit history independently with identity-aware timeline attribution.

---

This example combines the user store with a global "All" timeline scrubber and a separate scrubber per user. Switch between users (Alice, Bob, Carol) using the buttons at the top, make changes as each user, then use the sliders at the bottom to scrub through history. Move the "All" slider to walk the full chronological timeline; move a user's slider to selectively apply or revert just their contributions while everyone else's shapes stay on canvas. The two views stay in sync — the "All" total is the sum of every per-user count.
