---
title: Preventing race conditions with unique IDs
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - click
  - state
  - machine
  - race conditions
status: published
date: 12/21/2025
order: 2
---

# Preventing race conditions in click detection

The first bug we hit with click detection was stale timeouts. A user would click twice quickly, then click somewhere else, and the double-click handler would fire on the wrong target. The old timeout was still running, and when it fired, it used outdated state.

We fixed this with unique IDs.

## The stale timeout problem

Imagine this sequence:

1. User clicks shape A. Timeout starts, waiting to see if another click follows.
2. User clicks shape B before the timeout fires.
3. The original timeout fires—but now we're in a different context.

With naive timeout code, the callback might dispatch a double-click event using the old click position, or worse, affect the wrong shape entirely. The callback has no way to know that the world has changed.

## Unique IDs per sequence

Every time we start a new timeout, we generate a unique ID and store it:

```typescript
_getClickTimeout(state: TLClickState, id = uniqueId()) {
  this._clickId = id
  clearTimeout(this._clickTimeout)
  this._clickTimeout = this.editor.timers.setTimeout(() => {
    if (this._clickState === state && this._clickId === id) {
      // Only execute if state and ID still match
      // ...
    }
  }, /* ... */)
}
```

When the timeout fires, it checks two things: is the state machine still in the expected state, and is the stored ID still the one this timeout was created with?

If a new click sequence started, `_clickId` will have changed. The stale timeout sees a different ID than the one it captured in its closure, so it does nothing. The race condition becomes a harmless no-op.

## Dual timeout durations

We also discovered that double-click timing should differ from triple-click timing:

```typescript
state === 'idle' || state === 'pendingDouble'
	? this.editor.options.doubleClickDurationMs // 450ms
	: this.editor.options.multiClickDurationMs // 200ms
```

The first double-click gets 450ms. Users deliberately perform double-clicks and often pause slightly before the second click. But once you're in a multi-click sequence, you're clicking rapidly—200ms is enough, and a longer timeout would feel sluggish.

This matches how operating systems handle multi-click. Try triple-clicking in your text editor—there's a rhythm to it, faster after the initial double-click.

## Spatial constraints

Clicks also have to happen close together in space:

```typescript
const MAX_CLICK_DISTANCE = 40

if (
	this._previousScreenPoint &&
	Vec.Dist2(this._previousScreenPoint, this._clickScreenPoint) > MAX_CLICK_DISTANCE ** 2
) {
	this._clickState = 'idle'
}
```

If the second click is more than 40 screen pixels from the first, we reset to `idle`. The squared distance comparison avoids a `Math.sqrt()` call—we just compare against 1600 instead.

We use screen pixels, not page coordinates. This means 40 pixels is always 40 pixels visually, regardless of zoom level. At 200% zoom, you'd have more tolerance in page coordinates, but the same tolerance for your fingers.

## Touch versus mouse

Touch input gets a larger drag threshold:

```typescript
const threshold = this.editor.getInstanceState().isCoarsePointer
	? this.editor.options.coarseDragDistanceSquared // 36 (6px)
	: this.editor.options.dragDistanceSquared // 16 (4px)
```

Fingers wobble. A 4-pixel movement during a mouse click is probably intentional—you're starting to drag. But during a finger tap, 4 pixels of movement is just your finger's natural imprecision. We give touch input a 6-pixel threshold so taps aren't misinterpreted as drags.

## Key files

- `packages/editor/src/lib/editor/managers/ClickManager/ClickManager.ts` — Race condition prevention (lines 30-76), spatial constraints (lines 103-108, 196-211)
- `packages/editor/src/lib/options.ts` — Timeout and threshold configuration (lines 115-118)
- `packages/utils/src/lib/id.ts` — uniqueId implementation using nanoid
