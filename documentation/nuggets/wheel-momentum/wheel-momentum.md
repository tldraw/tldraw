---
title: Wheel momentum filtering
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - wheel
  - momentum
status: published
date: 12/21/2025
order: 1
---

# Wheel momentum filtering

Scroll on a MacBook trackpad, lift your fingers, and watch the page glide to a stop. That momentum scrolling feels smooth—until you integrate `@use-gesture/react` and discover it fires a phantom wheel event roughly 140ms after you stop scrolling. This creates a jarring jump right when the interaction should be settling. tldraw detects and ignores these phantom events using timestamp analysis.

## The phantom event

The `@use-gesture/react` library synthesizes wheel events to provide a unified gesture API. For momentum scrolling, it needs to signal when the gesture ends. Somewhere in its internals, it fires a final wheel event about 140ms after the last real scroll input. This event carries a momentum-adjusted delta—a "this is where the scroll would have ended up" value.

The problem is that tldraw has already processed all the real scroll events. The canvas has already come to rest. Then this phantom event arrives with a non-zero delta, and suddenly the canvas lurches in whatever direction the user was scrolling. It's subtle but unmistakable: a small, unexpected jump right after you stop scrolling.

The behavior appears intentional in use-gesture—the timing is consistent, and the delta calculation is deliberate. But tldraw doesn't want momentum-adjusted positioning. We handle scroll deltas frame-by-frame as they arrive. A synthetic "final destination" event just creates discontinuity.

## Timestamp-based detection

There's no flag on the event saying "I'm a phantom end event." The only distinguishing characteristic is timing: the phantom arrives 120-160ms after the previous real event, regardless of scroll speed or direction.

```typescript
let lastWheelTime = undefined as undefined | number

const isWheelEndEvent = (time: number) => {
	if (lastWheelTime === undefined) {
		lastWheelTime = time
		return false
	}

	if (time - lastWheelTime > 120 && time - lastWheelTime < 160) {
		lastWheelTime = time
		return true
	}

	lastWheelTime = time
	return false
}
```

Every wheel event records its timestamp. If the gap between events falls in the 120-160ms window, it's flagged as a phantom end event. The detection is deliberately narrow—real scroll events rarely have exactly 140ms gaps, and we don't want to filter legitimate input.

## Why 120-160ms?

The timing comes from observation. The phantom event consistently arrives around 140ms after momentum scrolling stops. The 20ms tolerance on each side accounts for timer variability—`setTimeout` and `requestAnimationFrame` don't guarantee millisecond precision, and the actual delay varies slightly by browser and system load.

A tighter window would miss some phantom events. A wider window risks filtering legitimate input—though in practice, users rarely scroll in bursts with exactly 140ms gaps.

## The filtering in context

The filter runs at the top of the wheel event handler:

```typescript
const onWheel: Handler<'wheel', WheelEvent> = ({ event }) => {
	if (!editor.getInstanceState().isFocused) {
		return
	}

	pinchState = 'not sure'

	if (isWheelEndEvent(Date.now())) {
		// ignore wheelEnd events
		return
	}

	// ... process legitimate wheel event
}
```

Note that `pinchState` resets before the phantom check. This ensures pinch disambiguation starts fresh even if the wheel event gets filtered. The ordering matters: we want state cleanup to happen unconditionally, but event dispatch to be conditional.

## What happens without the filter

Remove the timestamp check and scroll quickly, then lift your fingers. The canvas will drift smoothly as momentum decays, then jump slightly in the scroll direction right at the end. The jump is small—usually a few pixels—but it breaks the illusion of physical momentum. Instead of coming to a natural stop, the canvas hiccups.

The effect is more noticeable at higher zoom levels where small pixel movements translate to larger canvas movements. It's also more noticeable on trackpads than mice, since trackpad scrolling produces more momentum events.

## A fragile workaround

This is explicitly a workaround, not a proper solution:

```typescript
/**
 * GOTCHA
 *
 * UseGesture fires a wheel event 140ms after the gesture actually ends, with a
 * momentum-adjusted delta. This creates a messed up interaction where after you
 * stop scrolling suddenly the dang page jumps a tick. why do they do this? you
 * are asking the wrong person. it seems intentional though. anyway we want to
 * ignore that last event, but there's no way to directly detect it so we need to
 * keep track of timestamps. Yes this is awful, I am sorry.
 */
```

The code comment acknowledges the hack. If use-gesture changes its timing, this filter could start missing phantom events or filtering real ones. The behavior isn't documented in use-gesture's API, so there's no guarantee it will remain consistent across versions.

Possible future improvements:

- Use-gesture might add an explicit "end" event type that doesn't masquerade as a wheel event
- The timing might become configurable
- A velocity-based approach could detect the discontinuity (phantom events have momentum-level deltas but zero preceding velocity)

For now, timestamp detection works reliably with the current use-gesture version (10.3.1). The workaround has survived several minor version updates, suggesting the phantom event behavior is stable even if undocumented.

## Related

- [Pinch gesture disambiguation](./pinch-gesture.md) — Similar disambiguation for two-finger gestures
- [Click detection state machine](./click-state-machine.md) — Another timing-sensitive input handling system
