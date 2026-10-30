---
title: Analytics events
component: ./AnalyticsEventsExample.tsx
priority: 3
keywords:
  [
    analytics,
    tracking,
    telemetry,
    instrumentation,
    metrics,
    tool selection,
    shape creation,
    side effects,
    selection,
    onuievent,
  ]
---

Track analytics events for tool selection, shape creation, and selection changes.

---

This example tracks an event from three different layers of the SDK: tool selection via the
`onUiEvent` prop, shape creation and deletion via the store's side effects, and selection changes
via a reactive signal (debounced, since raw selection changes are noisy). Which hooks you reach
for, and which events are worth recording, will depend on your app.

Events funnel through a single `sendToAnalytics` function: to wire up a real provider, replace its
body with your service's capture call. A panel beside the canvas shows every event as it is sent.

For the full catalog of UI actions you can track, see the ui events example.
