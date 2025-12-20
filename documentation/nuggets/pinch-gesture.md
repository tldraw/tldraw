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

Two fingers touch the screen. Is the user about to zoom by spreading them apart, or pan by moving them together in the same direction? You can't know yet—both gestures start identically. Guessing wrong means triggering expensive operations the user didn't want, creating visible jank. The naive solution tries to handle both simultaneously, leading to jittery, unpredictable behavior.

The answer is to not decide immediately. Watch the fingers move, measure what they're doing, then commit to an interpretation once the pattern becomes clear. This "wait and see" approach trades a few milliseconds of latency for predictable, intentional gesture handling.

## The failure mode: guessing too early

The obvious implementation treats every two-finger touch as both zoom and pan simultaneously:

```typescript
function onTwoFingerMove(touch1, touch2) {
	// Always update zoom based on distance change
	const distance = Vec.Dist(touch1, touch2)
	const zoomDelta = distance - previousDistance
	camera.zoom += zoomDelta * 0.01

	// Also always pan based on midpoint movement
	const midpoint = Vec.Average(touch1, touch2)
	const panDelta = Vec.Sub(midpoint, previousMidpoint)
	camera.position = Vec.Add(camera.position, panDelta)
}
```

This fights itself. Even when the user is clearly panning—moving both fingers in parallel—minor variations in finger speed create tiny distance changes that trigger unwanted zoom. Conversely, zooming gestures often drift slightly, causing jittery panning. The camera does both at once, neither well.

In applications where zoom is expensive—like canvas-based tools where every visible object recalculates its screen-space representation—this double-handling creates perceptible lag. Zooming might trigger text re-rendering, LOD level changes, or geometry updates. Panning just adjusts a transform. Misclassifying a pan as a zoom makes a cheap operation expensive.

## The pattern: defer commitment until certain

Instead of handling both gestures at once, implement a state machine that starts in an undecided state and transitions based on observed movement:

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

When two fingers touch the screen, the state is "not sure". No zoom or pan events fire yet—the gesture handler just accumulates movement data. Once the pattern becomes clear, it transitions to either "zooming" or "panning" and begins dispatching the appropriate events.

```typescript
let pinchState = 'not sure' as 'not sure' | 'zooming' | 'panning'
```

This approach applies to any ambiguous gesture recognition problem. Touch and drag with one finger—is that scrolling, dragging, or the start of a long-press? Rapid taps—are those multiple clicks or a double-click? The pattern is the same: measure, wait, then commit.

## Measuring finger movement

Two metrics reveal the user's intent:

- **Touch distance**: How far the fingers have moved apart or together since the gesture started
- **Origin distance**: How far the midpoint between the fingers has traveled

```typescript
// How far have the two touch points moved towards or away from each other?
const touchDistance = Math.abs(currDistanceBetweenFingers - initDistanceBetweenFingers)
// How far has the point between the touches moved?
const originDistance = Vec.Dist(initPointBetweenFingers, prevPointBetweenFingers)
```

When the user moves their fingers apart or together more than a certain threshold, that's zooming. When the midpoint travels more than a different threshold, that's panning. The first signal to cross its threshold wins:

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

The thresholds (24 pixels for zoom, 16 for pan) were tuned empirically. Make them too sensitive and accidental finger drift triggers transitions. Too loose and the gesture feels unresponsive. These numbers hit the sweet spot where confident gestures resolve within a frame or two, while tentative movements wait a bit longer.

For your application, these numbers might differ. The pattern—measuring competing signals and committing when one dominates—remains the same.

## Why panning can become zooming, but not vice versa

Notice the asymmetry: panning can escalate to zooming (if fingers spread 64 pixels apart), but zooming never reverts to panning.

This reflects real user behavior. When someone pans and then spreads their fingers, they've changed their mind—now they want to zoom. The higher threshold (64 pixels vs. 24) prevents accidental transitions from small finger movements. But when someone zooms and their fingers drift in parallel, they're still zooming—just zooming while panning slightly. Zoom operations can handle both at once, so there's no reason to switch states.

The missing reverse transition (zooming → panning) is acknowledged but unimplemented:

```typescript
// In the "zooming" state, we just stay zooming—it's not YET possible
// to switch back to panning.
// todo: compare velocities of change in order to determine whether
// the user has switched back to panning
```

Velocity-based detection could enable this. Compare the rate of distance change to the rate of midpoint movement—if midpoint velocity dominates, that's probably panning. But in practice, the simpler version works well enough. The complexity isn't worth it yet.

This illustrates a broader principle: state machines don't need to support every possible transition. Some transitions are rare or represent user error. Leaving them out simplifies the implementation without harming the UX.

## Platform quirks: Safari's dual personality

Safari on macOS handles trackpad pinches differently than touch screen pinches. Trackpad gestures fire `gesturechange` and `gestureend` events instead of standard touch events. More importantly, trackpad pinches are always zooms—you can't pan with a two-finger pinch on a trackpad.

This means Safari trackpad gestures skip the "not sure" state:

```typescript
const isSafariTrackpadPinch = gesture.type === 'gesturechange' || gesture.type === 'gestureend'

const updatePinchState = (isSafariTrackpadPinch: boolean) => {
	if (isSafariTrackpadPinch) {
		pinchState = 'zooming'
	}
	// ...
}
```

iOS touch events from the same browser use the standard path. Two fingers on an iPhone screen could mean zoom or pan, so they go through the full state machine. Same browser, different input method, different behavior.

This kind of platform-specific handling is unavoidable in gesture recognition. Input events aren't standardized across devices and browsers. The state machine approach makes these special cases explicit—just another entry point into the state graph.

## The cost of waiting

While in the "not sure" state, no zoom or pan events dispatch. The gesture handler accumulates movement but doesn't act on it yet. This creates a delay—up to 24 pixels of finger spread or 16 pixels of movement—before the camera responds.

In practice, this delay is imperceptible. Most users move their fingers decisively enough that the state machine resolves within one or two frames. The alternative—guessing wrong and triggering the expensive operation when the user wanted the cheap one—creates noticeable jank. A few milliseconds of latency beats a janky experience.

This tradeoff appears in many gesture recognition systems. The faster you commit, the more responsive the interface feels. But commit too fast and you misclassify gestures, forcing corrections that feel worse than a small delay. The thresholds determine where on that spectrum you land.

## Takeaways

The "wait and see" pattern applies beyond pinch gestures. Anytime user input could mean multiple things, measure competing signals before committing to an interpretation. Single/double/triple clicks, drag vs. long-press, scroll vs. swipe—these all benefit from the same approach.

State machines make gesture recognition explicit. Rather than implicit boolean flags that interact in unpredictable ways, each state declares what it measures and what transitions it permits. This makes platform-specific behavior (like Safari's trackpad events) easy to handle as special entry points into the state graph.

The key insight: not all operations cost the same. If one interpretation is expensive and the other cheap, getting the classification right matters more than responding instantly. A few pixels of delay prevents jank that would be much more noticeable.

## Key files

- packages/editor/src/lib/hooks/useGestureEvents.ts - Pinch state machine and gesture handlers

## Related

- [Click detection state machine](./click-state-machine.md) - Single/double/triple/quadruple click disambiguation using states
- [Tools as state machines](./state-chart.md) - How tools use hierarchical state machines for complex interactions
- [Wheel momentum filtering](./wheel-momentum.md) - Detecting and filtering spurious scroll events
