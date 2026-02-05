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

# Race condition

We use modifier keys in tldraw to change what happens when dragging shapes.

If the user holds shift while dragging a shape, it gets constrained to the horizontal or vertical axis.

[gif]

If the user holds alt/option while dragging, it gets duplicated rather than moved.

[gif]

Holding ctrl/command toggles snapping.

[gif]

But what happens if you release both keys at the end of the drag?

Since the keyboard and mouse are separate devices, the events will almost always arrive separately.

Each of these is vulnerable to the race condition. If you hold option to duplicate a shape, then release option and the mouse together, the keyup might arrive first. The duplicate operation cancels. The shape just moves.

If the modifier keyup arrives before the mouseup, even by 10 milliseconds, then the drag completes without the modifier. Your constrained drag snaps to the wrong position. Your duplicate becomes a move. Your snap toggles back at the last moment.

We fix this by delaying modifier releases.

## The delay

To solve this, we start a 150ms timer when a modifier releases rather than clearing it immediately:

```typescript
if (info.shiftKey) {
	clearTimeout(this._shiftKeyTimeout)
	this._shiftKeyTimeout = -1
	inputs.setShiftKey(true)
} else if (!info.shiftKey && inputs.getShiftKey() && this._shiftKeyTimeout === -1) {
	this._shiftKeyTimeout = this.timers.setTimeout(this._setShiftKeyTimeout, 150)
}
```

During those 150ms, the modifier stays "held." If the drag ends in that window, it ends with the modifier active. If you press the modifier again, the timer clears and the modifier stays held continuously.

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

## Four independent timers

Each modifier tracks its own timeout:

```typescript
private _shiftKeyTimeout = -1 as any
private _altKeyTimeout = -1 as any
private _ctrlKeyTimeout = -1 as any
private _metaKeyTimeout = -1 as any
```

Releasing shift doesn't affect alt. You can hold multiple modifiers and release them in any order. Each gets its own 150ms grace period.

## Why 150ms

The delay has to be long enough to catch the gap between keyup and mouseup (typically 10-50ms), but short enough that it doesn't feel sticky. If you release shift, then immediately start a new drag expecting no constraint, shift shouldn't still be "held."

150ms works. We found it through testing.

## Key files

- `packages/editor/src/lib/editor/Editor.ts:10101-10175` — Timeout declarations and callbacks
- `packages/editor/src/lib/editor/Editor.ts:10303-10332` — Delay logic in event dispatch
- `packages/tldraw/src/lib/tools/SelectTool/childStates/Translating.ts` — Constrain and clone during drag
- `packages/tldraw/src/lib/tools/SelectTool/childStates/Resizing.ts` — Aspect ratio lock and center resize
- `packages/tldraw/src/lib/tools/SelectTool/childStates/Rotating.ts` — Rotation snapping
