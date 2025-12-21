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
  - state machine
  - touch handling
---

# Pinch gesture disambiguation

When a user touches the screen with two fingers, are they panning or zooming? Both gestures start the same way. They might spread their fingers to zoom, or drag them together to pan.

The obvious fix—handle both at once—creates jank. Minor finger drift during a pan triggers zoom. Minor spacing changes during a zoom trigger panning. The gestures fight each other. And zooming is expensive: it triggers shape re-rendering, LOD changes, text recalculation. Panning just moves the camera. Misclassifying a pan as a zoom makes a cheap operation expensive.

We defer the decision. The gesture handler watches what the fingers do, then commits once the pattern is clear.

## The failure mode

The obvious implementation treats every two-finger touch as both zoom and pan at once:

```typescript
function onTwoFingerMove(touch1, touch2) {
	const distance = Vec.Dist(touch1, touch2)
	const zoomDelta = distance - previousDistance
	camera.zoom += zoomDelta * 0.01

	const midpoint = Vec.Average(touch1, touch2)
	const panDelta = Vec.Sub(midpoint, previousMidpoint)
	camera.position = Vec.Add(camera.position, panDelta)
}
```

This fights itself. When the user clearly wants to pan—both fingers moving in parallel—tiny distance variations trigger zoom. When zooming, slight finger drift triggers panning. The camera does both at once, neither well.

## Deferring commitment with a state machine

Instead of guessing, we use a state machine that starts undecided:

```
          start
            │
            ▼
       ┌──────────┐
       │ not sure │
       └──────────┘
         │      │
         ▼      ▼
    ┌────────┐  ┌─────────┐
    │ panning │  │ zooming │
    └────────┘  └─────────┘
```

When two fingers touch the screen, no zoom or pan events fire. The gesture handler accumulates movement data. Once the pattern becomes clear, it transitions to either "zooming" or "panning" and dispatches the appropriate events.

```typescript
let pinchState = 'not sure' as 'not sure' | 'zooming' | 'panning'
```

## Measuring finger movement

Two metrics reveal intent:

- **Touch distance**: How far the fingers have moved apart or together since the gesture started
- **Origin distance**: How far the midpoint between the fingers has traveled

```typescript
// How far have the two touch points moved towards or away from each other?
const touchDistance = Math.abs(currDistanceBetweenFingers - initDistanceBetweenFingers)
// How far has the point between the touches moved?
const originDistance = Vec.Dist(initPointBetweenFingers, prevPointBetweenFingers)
```

The first signal to cross its threshold wins:

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
		if (touchDistance > 64) {
			pinchState = 'zooming'
		}
		break
	}
}
```

The thresholds (24 pixels for zoom, 16 for pan) were tuned empirically. Too sensitive and accidental drift triggers transitions. Too loose and gestures feel unresponsive. These numbers let confident gestures resolve within a frame or two while tentative movements wait a bit longer.

## Why panning can become zooming, but not vice versa

Notice the asymmetry: panning can escalate to zooming (at 64 pixels), but zooming never reverts to panning.

When someone pans and then spreads their fingers, they've changed their mind—now they want to zoom. The higher threshold prevents accidental transitions from small finger movements. But when someone zooms and their fingers drift in parallel, they're still zooming. Zoom operations can handle both at once, so there's no reason to switch states.

The reverse transition (zooming → panning) isn't implemented:

```typescript
// In the "zooming" state, we just stay zooming—it's not YET possible
// to switch back to panning.
// todo: compare velocities of change in order to determine whether
// the user has switched back to panning
```

Velocity-based detection could enable this—compare the rate of distance change to the rate of midpoint movement. In practice, the simpler version works well enough.

## Safari's dual personality

Safari on macOS handles trackpad pinches differently than touch screen pinches. Trackpad gestures fire `gesturechange` and `gestureend` events instead of standard touch events. More importantly, trackpad pinches are always zooms—you can't pan with a two-finger pinch on a trackpad.

So Safari trackpad gestures skip the "not sure" state:

```typescript
const isSafariTrackpadPinch = gesture.type === 'gesturechange' || gesture.type === 'gestureend'

if (isSafariTrackpadPinch) {
	pinchState = 'zooming'
}
```

iOS touch events from the same browser use the standard path. Two fingers on an iPhone could mean zoom or pan, so they go through the full state machine. Same browser, different input method, different behavior.

## The cost of waiting

While in "not sure", no events dispatch. This creates a delay—up to 24 pixels of finger spread or 16 pixels of movement—before the camera responds.

In practice, this is imperceptible. Most users move their fingers decisively enough that the state machine resolves within a frame or two. The alternative—guessing wrong and triggering expensive operations when the user wanted cheap ones—creates noticeable jank. A few milliseconds of latency beats a janky experience.

## Key files

- packages/editor/src/lib/hooks/useGestureEvents.ts - Pinch state machine and gesture handlers

## Related

- [Click detection state machine](./click-state-machine.md) - Single/double/triple/quadruple click disambiguation using states
- [Tools as state machines](./state-chart.md) - How tools use hierarchical state machines for complex interactions
- [Wheel momentum filtering](./wheel-momentum.md) - Detecting and filtering spurious scroll events
