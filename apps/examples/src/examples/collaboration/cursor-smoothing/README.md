---
title: Cursor smoothing
component: ./CursorSmoothingExample.tsx
keywords:
  [
    presence,
    cursors,
    smoothing,
    interpolation,
    tween,
    collaboration cursors,
    InstancePresenceRecordType,
  ]
priority: 6
---

Smooth collaborator cursor motion between throttled presence updates.

---

Collaborative cursor positions are broadcast at a throttled rate, so a naive renderer makes remote cursors jump from sample to sample. This example simulates a peer whose cursor is only updated every 120ms.

The collaborator cursor overlay measures the interval between the updates it receives and tweens between the last two positions over that interval, so the cursor glides instead of stepping. Because it only ever interpolates between points that have actually arrived, it never overshoots or rubber-bands. Toggle **Smooth cursor** to compare against the raw, throttled updates, and **Stress test** to drive the peer with abrupt stops and direction reversals — the motion the naive renderer makes jumpiest, and the case a prediction-based approach would rubber-band on.
