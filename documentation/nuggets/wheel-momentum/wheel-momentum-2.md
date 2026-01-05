---
title: Wheel momentum filtering
created_at: 12/21/2025
updated_at: 01/05/2026
keywords:
  - wheel
  - momentum
status: draft
date: 12/21/2025
order: 1
---

# Wheel momentum filtering

When we integrated `@use-gesture/react` for unified gesture handling, momentum scrolling on trackpads broke. You'd scroll, lift your fingers, watch the canvas glide to a stop—then it would jump. A small lurch in the scroll direction, right as the motion should be settling. Every time.

The jump came from a phantom wheel event that use-gesture fires about 140ms after scrolling stops. It carries a momentum-adjusted delta—a "this is where you would have ended up" value. But we'd already processed all the real scroll events. The canvas had come to rest. This synthetic event just made it jump.

The effect is more noticeable at higher zoom levels, where small pixel movements translate to larger canvas movements. It's also more noticeable on trackpads than mice, since trackpads produce more momentum events.

We filter out phantom events by checking timestamps. If two wheel events arrive 120-160ms apart, the second one is phantom and we ignore it.

## Finding the phantom

There's no flag on the event that says "I'm synthetic." The only distinguishing feature is timing. Real scroll events fire continuously—multiple events per frame during active scrolling. The phantom event arrives after a distinct gap: roughly 140ms, regardless of scroll speed or direction.

The behavior appears intentional in use-gesture. The timing is consistent across versions, and the delta calculation is deliberate. The library needs to signal when momentum scrolling ends, and somewhere in its internals it decided to do that by firing one last wheel event.

The problem is that we handle scroll deltas frame-by-frame as they arrive. A synthetic "final destination" event creates discontinuity we don't want.

## Timestamp detection

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

Every wheel event records its timestamp. If the gap between consecutive events falls in the 120-160ms window, we flag it as phantom. The detection window is deliberately narrow—real scroll events rarely have exactly 140ms gaps, and we don't want to filter legitimate input.

The 140ms delay comes from observation. We scrolled, measured, scrolled again, measured again. The phantom consistently appeared around 140ms. The 20ms tolerance on each side accounts for timer variability—JavaScript timers don't guarantee millisecond precision, and the delay varies slightly by browser and system load.

A tighter window would miss some phantoms. A wider window risks filtering legitimate bursts. Though in practice, users rarely produce bursts of scrolling with exactly 140ms gaps.

## A documented hack

This is explicitly a workaround, not a proper solution. From the code:

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

If use-gesture changes its timing, this filter could break—either missing phantoms or filtering real events. The behavior isn't documented in their API, so there's no guarantee it will stay consistent.

Possible future fixes:

- Use-gesture could add an explicit "end" event type instead of masquerading as a wheel event
- The timing could become configurable
- A velocity-based approach could detect the discontinuity (phantom events have momentum-level deltas but zero preceding velocity)

For now, timestamp detection works reliably with use-gesture 10.3.1. The workaround has survived several minor version updates, suggesting the phantom behavior is stable even if undocumented.
