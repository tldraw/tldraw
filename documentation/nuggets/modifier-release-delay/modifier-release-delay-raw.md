---
title: Modifier key release delay - raw notes
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
status: published
date: 02/04/2026
order: 4
---

# Modifier key release delay: raw notes

Internal research notes for the modifier-release-delay nuggets.

## Core problem

Users release modifier keys (shift, alt, ctrl, meta) and mouse button "at the same time" when ending a modified drag. But events arrive separately. Sometimes the keyup arrives a few milliseconds before mouseup, causing the drag to complete without the modifier.

**Example scenario:**
- User holds shift to constrain drag to horizontal/vertical
- User releases shift and mouse "together"
- keyup(shift) arrives at t=0
- mouseup arrives at t=10ms
- Result: drag ends unconstrained, snapping to wrong position

## Implementation location

`packages/editor/src/lib/editor/Editor.ts`

## Timeout mechanism

Four separate timeouts, one per modifier:

```typescript
/** @internal */
private _shiftKeyTimeout = -1 as any

/** @internal */
private _altKeyTimeout = -1 as any

/** @internal */
private _ctrlKeyTimeout = -1 as any

/** @internal */
private _metaKeyTimeout = -1 as any
```

## Delay logic

From `Editor.ts:10303-10332`:

```typescript
if (info.shiftKey) {
	clearTimeout(this._shiftKeyTimeout)
	this._shiftKeyTimeout = -1
	inputs.setShiftKey(true)
} else if (!info.shiftKey && inputs.getShiftKey() && this._shiftKeyTimeout === -1) {
	this._shiftKeyTimeout = this.timers.setTimeout(this._setShiftKeyTimeout, 150)
}
```

**Logic breakdown:**
1. If shift is pressed: clear any pending timeout, mark shift as held
2. If shift released AND was held AND no timeout already running: start 150ms timer
3. Same pattern for alt, ctrl, meta

## Timeout callback

From `Editor.ts:10104-10118`:

```typescript
@bind
_setShiftKeyTimeout() {
	this.inputs.setShiftKey(false)
	this.dispatch({
		type: 'keyboard',
		name: 'key_up',
		key: 'Shift',
		shiftKey: this.inputs.getShiftKey(),
		ctrlKey: this.inputs.getCtrlKey(),
		altKey: this.inputs.getAltKey(),
		metaKey: this.inputs.getMetaKey(),
		accelKey: this.inputs.getAccelKey(),
		code: 'ShiftLeft',
	})
}
```

**What happens:**
1. Actually clear the modifier flag
2. Dispatch synthetic key_up event so tools can respond

## The 150ms value

Chosen empirically:
- Long enough to cover typical keyup-to-mouseup gaps (10-50ms)
- Short enough not to feel "sticky" on subsequent drags
- Human reaction time creates natural window

## Race condition timeline

```
User's mental model:
  [start drag] -----> [end drag + release shift] (single moment)

What actually happens:
  [start drag] -----> [keyup: shift] -----> [mouseup] (two moments)
                             ^                  ^
                             |                  |
                        shift cleared     drag ends without constraint
```

With delay:

```
  [start drag] -----> [keyup: shift] -----> [mouseup] -----> [150ms] -----> [shift actually clears]
                             ^                  ^                                    ^
                             |                  |                                    |
                        timer starts      drag ends             synthetic key_up dispatched
                                      (shift still "held")
```

## Modifier use cases in tldraw

### Shift key

- **Drag/translate**: Constrain movement to single axis (horizontal or vertical)
- **Resize**: Lock aspect ratio
- **Rotate**: Snap to 15-degree increments
- **Brush selection**: Add to existing selection instead of replacing
- **Scribble selection**: Add to existing selection

### Alt/Option key

- **Drag/translate**: Clone (duplicate) shapes while dragging
- **Brush selection**: Switch to scribble brush (freehand selection)
- **Resize**: Resize from center instead of opposite corner

### Ctrl/Cmd key (Accel key)

Platform-aware: Cmd on macOS, Ctrl on Windows/Linux.

- **Brush selection**: Toggle wrap mode (shapes must be fully enclosed vs partial intersection)
- **Resize handle**: Enable crop mode on single selected shape
- **Translate/resize**: Toggle snap mode (inverts user preference)

### Meta key

Part of Accel key on macOS. Separate key on Windows/Linux but rarely used alone.

## Race condition applies to all

Each modifier has operations where timing matters:
- Shift + drag: release early = unconstrained snap
- Alt + drag: release early = move instead of duplicate
- Ctrl/Cmd + drag: release early = wrong snap behavior

All four use the same 150ms delay fix.

## Key files

- `packages/editor/src/lib/editor/Editor.ts:10101-10175` - Timeout declarations and callbacks
- `packages/editor/src/lib/editor/Editor.ts:10303-10332` - Delay logic in event dispatch
- `packages/tldraw/src/lib/tools/SelectTool/childStates/Translating.ts` - Drag/clone behavior
- `packages/tldraw/src/lib/tools/SelectTool/childStates/Resizing.ts` - Resize behavior
- `packages/tldraw/src/lib/tools/SelectTool/childStates/Rotating.ts` - Rotation snapping
- `packages/tldraw/src/lib/tools/SelectTool/childStates/Brushing.ts` - Brush selection logic
