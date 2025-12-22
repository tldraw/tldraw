---
title: Pinch gesture disambiguation
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - pinch
  - gesture
  - touch
status: published
date: 12/21/2025
order: 2
---

# Safari trackpad and the wheel momentum ghost

We use a state machine to disambiguate two-finger touch gestures—panning or zooming—by watching what the fingers do before committing to either interpretation. This works well for touch screens, where both gestures are possible. But Safari on desktop has a quirk: trackpad pinch gestures fire different events, and they mean something specific.

When you pinch on a Safari trackpad, the browser dispatches `gesturechange` and `gestureend` events instead of the standard touch events. These aren't ambiguous. A two-finger trackpad pinch is always zoom. You can't pan with trackpad pinch in Safari—that's not how trackpads work. Two-finger drag is scroll, and it comes through as wheel events, not gestures.

We bypass the state machine entirely for these events and go straight to zooming.

## Detecting Safari trackpad gestures

The @use-gesture library normalizes most browser differences, but Safari's gesture events are distinct enough to check explicitly. The event type reveals the input method:

```typescript
const isSafariTrackpadPinch = gesture.type === 'gesturechange' || gesture.type === 'gestureend'

if (isSafariTrackpadPinch) {
	pinchState = 'zooming' // Skip "not sure" state entirely
}
```

When we see a `gesturechange` event, we set the pinch state to `'zooming'` immediately. There's no deferred decision—Safari trackpad pinches don't pan, so we don't need to watch for pan-like movement. The event means zoom, and we handle it as zoom.

Touch screen Safari, meanwhile, uses the normal touch events with `event.touches.length > 1`. Those go through the state machine like any other multi-touch input. The distinction is platform: trackpad vs touchscreen, not browser.

## The phantom wheel event

The other Safari quirk isn't Safari-specific—it's in the @use-gesture library itself. After a wheel or trackpad scroll gesture ends, the library fires one last spurious event about 140 milliseconds later, with a momentum-adjusted delta. This creates a janky interaction: you stop scrolling, everything settles, then suddenly the viewport jumps a tick.

We don't know why @use-gesture does this. It seems intentional—the timing is too consistent to be a bug. But we don't want that final momentum adjustment, so we filter it out by tracking event timestamps.

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

When an event arrives between 120 and 160 milliseconds after the previous one, we recognize it as the phantom momentum event and ignore it. The window is narrow because real user input doesn't pause for exactly that duration—either the user is actively scrolling (events closer together) or they've stopped (events further apart).

In the wheel event handler:

```typescript
const onWheel: Handler<'wheel', WheelEvent> = ({ event }) => {
	if (!editor.getInstanceState().isFocused) {
		return
	}

	pinchState = 'not sure' // Reset pinch state

	if (isWheelEndEvent(Date.now())) {
		return // Drop the phantom event
	}

	// ... handle wheel event normally
}
```

We also reset the pinch state to `'not sure'` on any wheel event. This prevents conflicts between wheel and pinch gestures. If you're pinching and then start scrolling with the wheel, the pinch state clears and the next two-finger input starts fresh in the undecided state.

## Why this matters

The Safari trackpad shortcut saves a few milliseconds of latency on desktop. The state machine normally waits for 24 pixels of finger separation or 16 pixels of midpoint movement before committing to zoom or pan. For trackpad pinch, we skip that wait—we know it's zoom from the event type.

The momentum filtering prevents a visible glitch. That extra event arriving 140ms after the user stopped scrolling would cause the viewport to jump noticeably. The timestamp check is clunky—we're working around library behavior we can't control—but the alternative is accepting the glitch.

Both workarounds are small. They don't change the architecture. The state machine still handles all touch screen input. The wheel handler still processes scroll events. But these edge cases would be user-visible bugs without explicit handling, and they're the kind of thing you don't notice until you ship and people start using trackpads on Safari or scrolling quickly on any platform with @use-gesture.

## Key files

- packages/editor/src/lib/hooks/useGestureEvents.ts — Main pinch state machine and gesture handlers
- packages/editor/src/lib/editor/Editor.ts — Pinch event processing and camera updates
