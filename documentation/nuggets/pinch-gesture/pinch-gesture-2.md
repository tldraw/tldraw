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

When we built two-finger touch support, we ran into an ambiguity problem: the same initial input can be either panning (dragging with two fingers) or zooming (pinching). Both gestures start identically with two touch points on the screen. We needed a way to tell them apart without guessing wrong.

The naive approach—handling both simultaneously—creates problems. Minor finger drift during a pan triggers accidental zooms. Minor spacing changes during a zoom trigger accidental pans. Worse, zooming is expensive (shape re-rendering, level-of-detail changes, text recalculation) while panning is cheap (just move the camera position). Misclassifying pan as zoom makes a cheap operation expensive and janky.

## Deferred decision

Since we don't have enough information to know either way, we defer the decision. The gesture handler watches what the pointers do, then commits once we know enough to recognize the interaction pattern.

We use a three-state machine:

```typescript
let pinchState = 'not sure' as 'not sure' | 'zooming' | 'panning'
```

All gestures start in `'not sure'`. We track two metrics that reveal user intent:

**Touch distance** — How far the fingers have moved apart or together:
```typescript
const touchDistance = Math.abs(currDistanceBetweenFingers - initDistanceBetweenFingers)
```

**Origin distance** — How far the midpoint between fingers has traveled:
```typescript
const originDistance = Vec.Dist(initPointBetweenFingers, prevPointBetweenFingers)
```

Once either metric crosses a threshold, we commit:

- Touch distance > 24px → zoom
- Origin distance > 16px → pan

These values are tuned empirically. Too sensitive and accidental drift triggers the wrong gesture. Too loose and gestures feel unresponsive. At these thresholds, confident gestures resolve in 1-2 frames while tentative movements wait longer.

The `'not sure'` state introduces a few milliseconds of latency, but that delay is imperceptible. The benefit—avoiding misclassification that would cause visible jank—is worth the cost.

## Asymmetric transitions

The state machine has an asymmetry: panning can become zooming, but zooming never becomes panning.

When the user starts panning and then spreads their fingers, we switch to zoom:

```typescript
case 'panning': {
    if (touchDistance > 64) {
        pinchState = 'zooming'
    }
    break
}
```

The threshold here (64px) is higher than the initial detection threshold (24px). This prevents accidental transitions from small finger movements during a pan.

But zooming never transitions back:

```typescript
case 'zooming': {
    return  // No state change logic
}
```

There's a TODO comment in the code suggesting we could compare velocities to detect when the user switches from zoom to pan, but we haven't needed it. Zoom operations can handle both distance and position changes simultaneously—when you zoom in on something while moving your fingers, we zoom *and* translate the camera to keep the point under your fingers stable. There's no reason to leave the zooming state once we're in it.

The camera calculation during zoom accounts for both components:

```typescript
this.setCamera(
    {
        x: cx + dx / cz - (z - cz) * (info.point.x / cz - cx),
        y: cy + dy / cz - (z - cz) * (info.point.y / cz - cy),
        z,
    },
    { immediate: true }
)
```

The `dx / cz` term handles panning. The `(z - cz) * (info.point.x / cz - cx)` term adjusts for zoom, keeping the pinch point visually stable. This means zooming works whether the user holds their fingers still or moves them around—we just do both operations at once.

## Safari trackpad special case

Desktop Safari's trackpad pinch gesture uses different events (`gesturechange` and `gestureend` rather than touch events) and is always a zoom—you can't pan with a two-finger pinch on a trackpad. We detect this and skip straight to the zooming state:

```typescript
const isSafariTrackpadPinch =
    gesture.type === 'gesturechange' || gesture.type === 'gestureend'

if (isSafariTrackpadPinch) {
    pinchState = 'zooming'
}
```

This bypasses the state machine entirely for trackpad gestures, which is fine because there's no ambiguity to resolve.

## Where it lives

The pinch state machine is in `/packages/editor/src/lib/hooks/useGestureEvents.ts`. The editor processes pinch events and updates the camera in `/packages/editor/src/lib/editor/Editor.ts` around line 10327.

The asymmetric state transitions have worked well in practice. The panning → zooming transition handles the common case where someone starts dragging and then decides to zoom. The lack of a reverse transition hasn't been a problem—zoom's ability to handle both transformations at once means we don't need to detect the switch back.
