---
title: Wheel or trackpad?
created_at: 12/20/2025
updated_at: 01/05/2026
keywords:
  - wheel
  - trackpad
  - scroll
  - input
  - mouse
  - detection
status: draft
date: 01/05/2026
generation-notes: Second draft. Reframed to lead with user experience problem.
order: 1
---

# Wheel or trackpad?

Try this: open any canvas app and scroll.

Did the canvas scroll in the right direction?

If you're on a laptop trackpad, you probably expected scrolling to pan the camera, moving the content around pushing paper across a desk. If you're using a mouse wheel, you probably expected to zoom, with each wheel movement bringing you closer or further from the canvas.

Unfortunately, both gestures fire the exact same browser event. The browser doesn't tell us which device you're using. And if we guess wrong, the canvas feels broken.

## Why it feels so wrong

The mismatch isn't just unexpected—it's disorienting.

When you scroll expecting to pan and the canvas zooms instead, your target flies off screen. You've lost your place. When you scroll expecting to zoom and the canvas pans, you're suddenly looking at empty space, wondering where your work went.

These aren't minor annoyances. They break the fundamental illusion of direct manipulation—the feeling that you're touching the canvas rather than operating a machine. Every wrong response reminds you that you're fighting the software instead of using it.

Canvas applications live or die by this feeling. A canvas that responds wrong to scrolling feels cheap and broken, regardless of what else it does well.

## The impossible detection problem

The browser gives us this for wheel events:

```typescript
interface WheelEvent {
	deltaX: number // Horizontal scroll amount
	deltaY: number // Vertical scroll amount
	deltaMode: number // Units (pixels, lines, or pages)
}
```

Notice what's missing: any hint about what device generated the event. No `deviceType`. No `isTrackpad`. Nothing.

People have tried to detect the difference through heuristics:

- **Delta size**: Mouse wheels produce bigger, chunkier deltas. But a sensitive mouse might produce smaller deltas than a sluggish trackpad.
- **Event frequency**: Trackpads fire events smoothly. But momentum scrolling creates gaps, and spinning a wheel quickly fires events rapidly.
- **Delta mode**: Sometimes mouse wheels report "lines" while trackpads report "pixels." Sometimes they both report pixels.
- **Platform detection**: MacBooks have trackpads, desktops have mice. But laptops have USB mice, and desktops have trackpads.

Every heuristic works on some combinations of browser, OS, and hardware—and fails on others. Worse, an OS update can change the behavior overnight. We've seen detection that worked for years suddenly break after a Chrome update.

There is no reliable way to detect input device from wheel events. This isn't a gap in our knowledge; it's a gap in the web platform.

## Our solution: just ask

When automatic detection is impossible, the honest thing is to ask:

```typescript
interface TLUserPreferences {
	inputMode?: 'trackpad' | 'mouse' | null
}
```

tldraw puts this choice in the help menu: Auto, Trackpad, or Mouse. Pick one, and scrolling works the way you expect. The preference persists in localStorage and syncs across browser tabs.

This feels like admitting defeat—shouldn't software just work? But consider the alternative: software that usually works, except when it doesn't, and you can never predict when. Explicit preferences beat unreliable magic.

## The ctrl key escape hatch

Even with the right preference set, sometimes you need the opposite behavior. Holding ctrl inverts the action:

- In trackpad mode: ctrl+scroll zooms instead of panning
- In mouse mode: ctrl+scroll pans instead of zooming

This pattern is familiar from other canvas applications. It means you don't have to change preferences just because you occasionally need the other behavior.

## The real cost

The tradeoff is onboarding friction. A new user scrolls, gets the wrong behavior, and has to find the preference to fix it. That's a bad first impression.

But the alternative—guessing wrong unpredictably—creates ongoing friction. Users can never develop muscle memory when the same gesture sometimes pans and sometimes zooms. One preference change beats a thousand moments of confusion.

## What would actually fix this

Browser vendors could expose device information on wheel events. A simple `inputDeviceType` property would let applications respond correctly without asking users to configure anything.

Until that happens, we'll keep asking. It's not elegant, but it's honest—and honesty builds more trust than clever heuristics that sometimes fail.

## Key files

- `packages/editor/src/lib/editor/Editor.ts:10417-10480` — Wheel event handling and behavior switching
- `packages/editor/src/lib/config/TLUserPreferences.ts` — inputMode preference definition
- `packages/tldraw/src/lib/ui/components/InputModeMenu.tsx` — Preference UI

## Related

- [Pinch gesture disambiguation](./pinch-gesture.md) — How two-finger trackpad gestures distinguish zoom from pan
- [Wheel momentum filtering](./wheel-momentum.md) — Filtering phantom scroll events from momentum decay
