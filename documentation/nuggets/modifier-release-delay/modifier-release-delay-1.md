---
title: Modifier key release delay
created_at: 02/04/2026
updated_at: 02/04/2026
keywords:
  - modifier
  - keyboard
  - shift
  - alt
  - ctrl
  - meta
  - race condition
  - input
status: draft
date: 02/04/2026
order: 4
---

# Modifier key release delay

Hold shift while dragging a shape to constrain it horizontally or vertically. Release both keys "at once" and the shape goes where you expect. We spent time making that work.

The problem: when you release the mouse button and shift key together, they don't actually arrive together. The keyboard and mouse are separate devices. One keyup event might arrive 10 milliseconds before the mouseup. If the keyup arrives first, the editor clears the shift flag, then the drag completes without constraint, and the shape snaps to the wrong position.

You did everything right. The result is wrong.

## The fix

We don't trust that a modifier release is intentional until 150 milliseconds have passed. When shift releases, a timer starts. The shift flag stays held. If the drag ends during that window, it ends with shift still active.

```typescript
if (info.shiftKey) {
	clearTimeout(this._shiftKeyTimeout)
	this._shiftKeyTimeout = -1
	inputs.setShiftKey(true)
} else if (!info.shiftKey && inputs.getShiftKey() && this._shiftKeyTimeout === -1) {
	this._shiftKeyTimeout = this.timers.setTimeout(this._setShiftKeyTimeout, 150)
}
```

If you press shift again during those 150ms, the timer clears and shift stays held. The race condition disappears.

## When the timer fires

After 150ms, we actually clear the modifier and dispatch a synthetic key_up event:

```typescript
_setShiftKeyTimeout() {
	this.inputs.setShiftKey(false)
	this.dispatch({
		type: 'keyboard',
		name: 'key_up',
		key: 'Shift',
		code: 'ShiftLeft',
		// ... other modifier flags
	})
}
```

Tools listening for key_up still receive the event. It's just delayed. Most tools don't care about the exact timing of a modifier release. The ones that do—like constrained drag or snap-to-grid—care about whether the modifier was held when the action completed. The delay handles that correctly.

## Why 150ms

The delay needs to cover the gap between keyup and mouseup, but not feel sticky when you start a new drag. If you release shift, then immediately start another drag expecting no modifier, shift shouldn't still be "held" from the previous action.

150ms works. Shorter delays miss some cases. Longer delays make the editor feel sluggish. We found this value through testing.

## All modifiers

The same logic applies to shift, alt, ctrl, and meta. Each tracks its own timeout independently. Releasing shift doesn't affect alt.

```typescript
private _shiftKeyTimeout = -1 as any
private _altKeyTimeout = -1 as any
private _ctrlKeyTimeout = -1 as any
private _metaKeyTimeout = -1 as any
```

The pattern repeats identically because the race condition applies equally to all of them.

## Key files

- `packages/editor/src/lib/editor/Editor.ts:10101-10175` — Timeout declarations and callbacks
- `packages/editor/src/lib/editor/Editor.ts:10303-10332` — Delay logic in event dispatch
