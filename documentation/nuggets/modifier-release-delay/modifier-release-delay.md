---
title: Modifier key release delay
created_at: 12/29/2025
updated_at: 12/29/2025
keywords:
  - modifier
  - keyboard
  - shift
  - alt
  - ctrl
  - meta
  - race condition
  - input
status: published
date: 12/29/2025
order: 4
---

# Modifier key release delay

Hold shift while dragging a shape to constrain it to horizontal or vertical movement. Hold alt to duplicate. These modifier-enhanced drags feel natural—until you release both keys at once.

The problem: when ending a constrained drag, users typically release the mouse button and the shift key at nearly the same time. But "nearly" isn't "exactly." Sometimes the shift key releases a few milliseconds before the mouse button. The keyup event arrives first. The editor immediately clears the shift flag. The drag ends. And because shift wasn't held when the drag completed, the shape snaps to its unconstrained position.

The user held shift throughout the entire drag and released it at the same moment they released the mouse. They did everything right. The result is wrong.

## The race condition

This is a physical race condition. The user performs a single conceptual action—"finish this constrained drag"—that involves two physical events: releasing a key and releasing a mouse button. The order these events arrive in JavaScript doesn't reflect the user's intent.

```
User's mental model:
  [start drag] -----> [end drag + release shift] (single moment)

What actually happens:
  [start drag] -----> [keyup: shift] -----> [mouseup] (two moments)
                              ^                  ^
                              |                  |
                         shift cleared     drag ends without constraint
```

The gap might be 10 milliseconds. But that's enough to change the outcome.

## Delayed releases

The fix is simple: don't trust that a modifier release is intentional. When shift (or alt, ctrl, or meta) releases, start a 150ms timer. Only after that timer expires does the modifier actually clear.

```typescript
if (info.shiftKey) {
  clearTimeout(this._shiftKeyTimeout)
  this._shiftKeyTimeout = -1
  inputs.setShiftKey(true)
} else if (!info.shiftKey && inputs.getShiftKey() && this._shiftKeyTimeout === -1) {
  this._shiftKeyTimeout = this.timers.setTimeout(this._setShiftKeyTimeout, 150)
}
```

If the user presses shift again during those 150ms, the timer is cancelled and shift stays held. If a drag completes during those 150ms, shift is still considered held for the purposes of the drag. The race condition disappears.

## Why 150ms

The delay needs to be long enough to cover the gap between "user intends to release" and "all related events arrive," but short enough that it doesn't feel sluggish.

150 milliseconds is imperceptible in the context of ending a drag—the shape is already where the user put it, and they're moving on to the next action. But it's long enough to catch the case where the keyup arrives 10-50ms before the mouseup.

Shorter delays (50ms) would miss some cases. Longer delays (300ms) risk feeling sticky—the user explicitly releases shift, then immediately starts a new drag expecting no modifier, but shift is still "held" from the previous action. 150ms threads this needle.

## All modifiers, same pattern

The same logic applies to all four modifier keys:

```typescript
// Shift
this._shiftKeyTimeout = this.timers.setTimeout(this._setShiftKeyTimeout, 150)

// Alt
this._altKeyTimeout = this.timers.setTimeout(this._setAltKeyTimeout, 150)

// Ctrl
this._ctrlKeyTimeout = this.timers.setTimeout(this._setCtrlKeyTimeout, 150)

// Meta
this._metaKeyTimeout = this.timers.setTimeout(this._setMetaKeyTimeout, 150)
```

Each modifier tracks its own timeout independently. Releasing shift doesn't affect alt. The pattern repeats identically because the race condition applies equally to all modifiers.

## When the delay fires

When the timeout expires, the modifier clears and a synthetic keyboard event dispatches:

```typescript
_setShiftKeyTimeout() {
  this.inputs.setShiftKey(false)
  this.dispatch({
    type: 'keyboard',
    name: 'key_up',
    key: 'Shift',
    code: 'ShiftLeft',
    // ... modifier flags
  })
}
```

This ensures any tool listening for key_up events still receives them—just 150ms late. Most tools don't care about the exact timing of a modifier release. The ones that do (like snap-to-grid or constrained rotation) care about whether the modifier was held when the action completed, which the delay handles correctly.

## An honest hack

This is a workaround for a fundamental mismatch between hardware and intent. The keyboard and mouse are separate input devices with no coordination. The operating system delivers their events in arrival order. JavaScript can't know that two events "belong together" conceptually.

The 150ms delay is an empirical fix—tuned through testing rather than derived from first principles. It works because human reaction time creates a natural window: if someone releases shift and the mouse within 150ms, they almost certainly meant to release them together. If they're more than 150ms apart, they're probably separate actions.

It's not elegant. But it's the difference between "this app is broken" and "this app does what I expect."

## Key files

- `packages/editor/src/lib/editor/Editor.ts` — Modifier delay implementation in `_flushEventForTick` (lines 10291-10321)

## Related

- [Click detection state machine](../click-state-machine/click-state-machine.md) — Race condition prevention in click sequences
- [Pinch gesture disambiguation](../pinch-gesture/pinch-gesture.md) — Deferred commitment for ambiguous gestures
