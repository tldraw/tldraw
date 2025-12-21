---
title: Pinch gesture disambiguation
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - pinch
  - gesture
  - touch
---

# Pinch gesture disambiguation

When we started handling two-finger gestures on touchscreens, we ran into an ambiguity: the same initial input—two fingers touching the screen—could mean either panning (dragging) or zooming (pinching). Both gestures start identically, but they require completely different responses.

The naive approach would be to handle both simultaneously: pan the camera when the midpoint moves, zoom when the fingers spread or contract. This fails immediately. Minor finger drift during a pan triggers accidental zoom. Tiny spacing changes during zoom trigger unwanted camera movement. Worse, zooming is expensive—it triggers shape re-rendering, level-of-detail changes, text recalculation—while panning just moves the camera position. Misclassifying a cheap pan as an expensive zoom makes the interaction janky.

Since we don't have enough information at the start to know which gesture the user intends, we defer the decision. We watch what the fingers do and commit once the pattern becomes clear.

## State machine

The pinch handler uses a simple three-state machine:

```typescript
let pinchState = 'not sure' as 'not sure' | 'zooming' | 'panning'
```

When two fingers touch the screen, we start in `not sure`. We track two metrics:

- **Touch distance**: how far the finger separation has changed from the initial distance
- **Origin distance**: how far the midpoint between the fingers has moved from its initial position

```typescript
const touchDistance = Math.abs(currDistanceBetweenFingers - initDistanceBetweenFingers)
const originDistance = Vec.Dist(initPointBetweenFingers, prevPointBetweenFingers)
```

The state machine transitions based on these values:

```typescript
function updatePinchState() {
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
      if (touchDistance > 64) {
        pinchState = 'zooming'
      }
      break
    }
    case 'zooming': {
      // No transitions out of zooming
      break
    }
  }
}
```

## Threshold values

The thresholds were chosen empirically. If 24 pixels of finger separation change occurs first, we're zooming. If 16 pixels of midpoint movement occurs first, we're panning.

These specific values balance sensitivity against accidental triggering. Set them too low and minor hand tremors or finger drift trigger the wrong gesture. Set them too high and gestures feel unresponsive. The current values resolve confident gestures in one or two frames while making tentative movements wait longer before committing.

The asymmetry matters. The pan threshold (16px) is lower than the zoom threshold (24px) because panning is the cheaper operation. We'd rather commit early to a pan than wait and risk treating it as a zoom.

## Asymmetric transitions

Once in the `panning` state, we allow transitioning to `zooming` if the finger separation crosses 64 pixels. This handles the case where someone starts dragging the canvas with two fingers, then decides to zoom by spreading them apart. The higher threshold (64px instead of 24px) prevents accidental transitions from small finger movements during panning.

The reverse transition doesn't exist. Once we're zooming, we stay zooming. The zoom gesture can handle both distance changes and position changes simultaneously—zooming around a moving focal point—so there's no need to switch back to panning.

## Safari trackpad

Desktop Safari complicates this. Safari's trackpad pinch generates `gesturechange` and `gestureend` events instead of touch events. These are always zoom gestures—you can't two-finger pan on a trackpad. We detect these events and skip straight to the `zooming` state:

```typescript
const isSafariTrackpadPinch =
  gesture.type === 'gesturechange' || gesture.type === 'gestureend'

if (isSafariTrackpadPinch) {
  pinchState = 'zooming'
}
```

## Cost of ambiguity

While in the `not sure` state, we don't dispatch any events to the editor. The gesture is effectively on hold until we have enough information to classify it. For decisive gestures, this delay is one or two frames—imperceptible. For tentative movements that hover near the thresholds, the delay is longer.

This latency is the cost of disambiguation. We accept a few milliseconds of input lag to avoid misclassifying gestures and triggering expensive, janky zoom operations when the user just wanted to pan.

## Implementation

The pinch state machine lives in `useGestureEvents.ts`, which wraps the `@use-gesture` library. The library handles the low-level details of touch tracking—calculating midpoints, measuring distances, normalizing across browsers—while our state machine decides what those gestures mean.

When the state resolves to `zooming`, we dispatch pinch events with updated zoom levels. When it resolves to `panning`, we dispatch pinch events with a fixed zoom level and changing positions. The editor's pinch handler applies these to the camera, ensuring the point under the user's fingers stays stable during zoom.

The state resets to `not sure` at the end of each gesture, ready for the next interaction.

---

**Source files:**
- `/packages/editor/src/lib/hooks/useGestureEvents.ts` - Pinch state machine and gesture handlers
- `/packages/editor/src/lib/editor/Editor.ts` - Camera updates from pinch events (lines ~10327-10394)
- `/packages/editor/src/lib/primitives/Vec.ts` - Distance calculations
