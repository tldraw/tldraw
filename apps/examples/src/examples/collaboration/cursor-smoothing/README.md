---
title: Cursor smoothing with velocity
component: ./CursorSmoothingExample.tsx
keywords:
  [
    presence,
    cursors,
    velocity,
    smoothing,
    interpolation,
    extrapolation,
    dead reckoning,
    collaboration cursors,
    InstancePresenceRecordType,
  ]
priority: 6
---

Smooth collaborator cursor motion between throttled presence updates.

---

Collaborative cursor positions are broadcast at a throttled rate, so a naive renderer makes remote cursors jump from sample to sample. This example simulates a peer whose cursor is only updated every 120ms, but whose presence record also carries a velocity vector.

The collaborator cursor overlay eases toward each received position and dead-reckons along the broadcast velocity between samples, so the cursor glides instead of stepping. Toggle the checkbox to compare the smoothed motion against the raw, throttled updates.

The velocity lives on `TLInstancePresence['cursor'].velocity` (page units per millisecond) and is populated from the local pointer's sampled velocity in the default presence derivation.
