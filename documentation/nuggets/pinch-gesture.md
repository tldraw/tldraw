---
title: Pinch gesture disambiguation
created_at: 12/20/2025
updated_at: 12/20/2025
keywords:
  - pinch
  - gesture
  - touch
  - zoom
  - pan
  - trackpad
---

# Pinch gesture disambiguation

When two fingers touch the screen, the user might want to zoom (spreading fingers apart) or pan (moving both fingers in the same direction). These gestures start identically—two fingers down—so the system can't know what the user intends until they start moving. tldraw uses a state machine that observes finger movement before committing to an interpretation.

## Why this matters

Zooming is expensive. When you zoom the canvas, every visible shape needs to recalculate its screen-space representation. Text needs to re-render at the new scale. Image LOD levels might change. The entire rendering pipeline reacts to zoom changes.

Panning, by contrast, is cheap. Moving the camera just adjusts a transform—nothing re-renders, nothing recalculates. The performance difference is significant enough that accidentally zooming when the user meant to pan creates noticeable jank.

The challenge is that both gestures begin the same way. Two fingers on the screen, then movement. The system needs to watch the movement pattern before deciding which interpretation to use.

## The state machine

tldraw's pinch handling uses a three-state machine:

```
          start
            │
            ▼
       ┌──────────┐
       │ not sure │ ←── initial state
       └──────────┘
         │      │
         │      │
         ▼      ▼
    ┌────────┐  ┌─────────┐
    │ panning │  │ zooming │
    └────────┘  └─────────┘
         │            │
         │            │
         └────────────┘
               │
               ▼
          (end: reset)
```

The state starts at "not sure" when two fingers are detected. From there, it transitions based on finger movement:

```typescript
let pinchState = 'not sure' as 'not sure' | 'zooming' | 'panning'
```

## Detection logic

The system tracks two measurements:

- **Touch distance**: How far the fingers have moved apart or together since the gesture started
- **Origin distance**: How far the midpoint between the fingers has traveled

```typescript
// How far have the two touch points moved towards or away from each other?
const touchDistance = Math.abs(currDistanceBetweenFingers - initDistanceBetweenFingers)
// How far has the point between the touches moved?
const originDistance = Vec.Dist(initPointBetweenFingers, prevPointBetweenFingers)
```

The thresholds determine which gesture wins:

```typescript
switch (pinchState) {
  case 'not sure': {
    if (touchDistance > 24) {
      pinchState = 'zooming'
    } else if (originDistance > 16) {
      pinchState = 'panning'
    }
    break
  }
  case 'panning': {
    // Higher threshold to switch from panning to zooming
    if (touchDistance > 64) {
      pinchState = 'zooming'
    }
    break
  }
}
```

The numbers matter. 24 pixels of finger spread triggers zoom detection. 16 pixels of midpoint movement triggers pan. These thresholds were tuned to match user intent—quick, confident gestures get recognized fast, while ambiguous movements get a bit more time.

## Asymmetric transitions

Notice that once zooming starts, the state never transitions back to panning. But panning can escalate to zooming if the user spreads their fingers far enough (64 pixels).

This asymmetry is intentional. When someone is zooming and their fingers drift in the same direction, they're probably still zooming—just zooming while panning slightly. The camera handles both simultaneously during zoom operations. But when someone is panning and starts spreading their fingers, they've likely decided to zoom instead, so the system switches.

The reverse transition (zooming → panning) is notably absent. The comment in the code acknowledges this:

```typescript
// In the "zooming" state, we just stay zooming—it's not YET possible
// to switch back to panning.
// todo: compare velocities of change in order to determine whether
// the user has switched back to panning
```

Velocity-based detection could enable this transition, but in practice the current behavior works well enough that the complexity hasn't been worth adding.

## Platform differences

Safari on macOS has a special case. When you pinch on a MacBook trackpad, Safari fires `gesturechange` and `gestureend` events instead of the usual touch events. These gestures are always zooms—trackpad pinches don't pan, they zoom.

```typescript
const isSafariTrackpadPinch =
  gesture.type === 'gesturechange' || gesture.type === 'gestureend'

const updatePinchState = (isSafariTrackpadPinch: boolean) => {
  if (isSafariTrackpadPinch) {
    pinchState = 'zooming'
  }
  // ...
}
```

iOS touch events, despite coming from the same browser, use the standard path. A two-finger touch on iOS could be either zoom or pan, so it goes through the state machine. Trackpad pinches skip the "not sure" state entirely.

## What happens during disambiguation

While in the "not sure" state, no zoom or pan events are dispatched to the camera. The gesture handler accumulates movement data, waiting until the pattern becomes clear. This means there's a tiny delay—up to 24 pixels of finger spread or 16 pixels of movement—before the camera starts responding.

In practice, this delay is imperceptible. Most users move their fingers decisively enough that the state machine resolves within a frame or two. The alternative—guessing wrong and having to reverse a zoom or pan—would feel much worse.

## The zoom calculation

Once zooming is detected, the system calculates the zoom level from the gesture offset:

```typescript
const currZoom = offset[0] ** editor.getCameraOptions().zoomSpeed
```

The `zoomSpeed` option (defaulting to 1) acts as an exponent on the raw pinch distance. This lets applications tune how "sensitive" pinch-to-zoom feels. The calculation uses `@use-gesture/react`, which normalizes pinch distances across different devices and browsers.

## Key files

- packages/editor/src/lib/hooks/useGestureEvents.ts - Pinch state machine and gesture handlers

## Related

- [Wheel momentum filtering](./wheel-momentum.md) - Similar disambiguation for scroll wheel events
- [Click detection state machine](./click-state-machine.md) - Another input disambiguation state machine
