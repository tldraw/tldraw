---
title: When browsers lie about touch position
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - edge
  - scrolling
  - touch
  - input
readability: 9
voice: 8
potential: 8
accuracy: 10
notes: 'Opens with our experience. Connects to broader touch vs mouse patterns. Constants list slightly ChatGPT-ish but content is good.'
status: published
date: 12/21/2025
order: 1
---

# Edge scrolling

When we added edge scrolling to tldraw, we ran into a problem that appears everywhere touch and mouse input coexist: browsers lie about where your finger is.

Drag a shape toward the edge of the screen. With a mouse, you know exactly when the cursor enters the edge zone—you can see it. With touch, your finger reaches the edge before the browser tells you it has. The browser reports the center of your finger's contact area, but your actual finger extends roughly 12 pixels beyond that center point. By the time the reported position triggers edge scrolling, your finger is already past the viewport edge.

We compensate by treating touch pointers as having width:

```typescript
const pw = isCoarse ? editor.options.coarsePointerWidth : 0
const pMin = position - pw
const pMax = position + pw
```

For touch input, a reported position of x=20 creates an effective range from 8 to 32. If the edge scroll zone extends 8 pixels from the viewport edge, we trigger scrolling when any part of that range enters the zone—not just the center point. Mouse pointers get no extension; users expect pixel-perfect precision from a cursor they can see.

This pattern—compensating for the gap between reported position and perceived position—shows up throughout touch handling. Tap targets need to be larger than they appear. Drag thresholds need to account for finger jitter. Any time you're building for touch alongside mouse, you're managing two different relationships between input and intent.

## Why acceleration matters more than speed

The obvious approach to edge scrolling is: pointer near edge → scroll. But we found that constant-speed scrolling feels wrong. You overshoot constantly. Fine positioning near the edge becomes frustrating.

We use two-phase acceleration instead. First, nothing happens. You enter the edge zone and the canvas stays still for 200ms. This delay prevents accidental triggers when you're just dragging near the edge, not trying to scroll.

After the delay, velocity ramps up following a cubic curve:

```typescript
const eased = EASINGS.easeInCubic(
	Math.min(1, this._edgeScrollDuration / (edgeScrollDelay + edgeScrollEaseDuration))
)
```

The cubic function (t³) front-loads the slow phase. A linear ramp hits 50% speed at the halfway point; a cubic hits only 12.5%. This gives you about 100ms of very slow scrolling where you can make fine adjustments before the speed ramps up.

The proximity factor adds another dimension of control. Closer to the edge means faster scrolling:

```typescript
if (pMin < min) {
	return Math.min(1, (min - pMin) / dist)
}
```

These multiply together. At 300ms (100ms into the acceleration phase), you're at 12.5% of max easing. If you're also halfway into the edge zone, proximity is 0.5. Final velocity: 6.25% of maximum. You can modulate speed by adjusting both how long you've been in the zone and how deep into it you are.

This two-variable control—time and distance—is what makes edge scrolling feel usable rather than frustrating. It's the same insight behind scroll momentum on trackpads: users need velocity to feel connected to their input, not just on/off.

## Small screens need different tuning

On phones, full-speed edge scrolling is disorienting. The screen is already small; scrolling at desktop speeds makes the canvas feel out of control.

We multiply scroll speed by 0.612 for any axis under 1000 pixels:

```typescript
const screenSizeFactorX = screenBounds.w < 1000 ? 0.612 : 1
const screenSizeFactorY = screenBounds.h < 1000 ? 0.612 : 1
```

Why 0.612? It's close to the golden ratio's reciprocal (1/φ ≈ 0.618). Whether that's intentional or just where empirical tuning landed is lost to history. The effect is a roughly 40% speed reduction that makes small-screen scrolling feel controlled.

Each axis is independent. A 800×1200 screen gets the reduction on width but not height. The threshold isn't scientific—1000 pixels is a rough boundary between phone-sized and tablet-or-larger viewports.

## The constants that matter

Edge scrolling is maybe 50 lines of math, but the feel depends entirely on the constants:

- **8-pixel edge zone**: Large enough to trigger reliably, small enough to not eat into usable canvas space
- **200ms delay**: Long enough to prevent accidental triggers, short enough to not feel laggy
- **200ms acceleration**: Enough time for fine control in the slow phase
- **12-pixel touch width**: Matches typical finger contact area
- **0.612 small-screen factor**: Empirically tuned

Change any of these and the feel degrades. The 200ms delay in particular required testing—100ms felt twitchy, 300ms felt unresponsive. These numbers aren't derivable from first principles; they come from watching people use the feature and adjusting until it disappeared.

That's the goal for edge scrolling: invisibility. When it works, touch users don't notice the pointer width compensation. Mouse users don't accidentally trigger it. The cubic ease-in prevents jarring transitions. You just drag things around and the canvas moves when you need it to.
