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
readability: 8
voice: 8
potential: 8
accuracy: 9
notes: 'Clear structure with video demos. Code verified against source. Added broader framing connecting to click state machine and pinch detection patterns.'
---

NOTION LINK: https://www.notion.so/tldraw/Modifier-keys-2fd3e4c324c080eaa763dcd82adc8e2c?source=copy_link

In tldraw, we’ve added modifier keys to change what happens to shapes while dragging them.

Holding shift while dragging constrains shapes to the horizontal or vertical axis.

[hold-shift.mp4](attachment:292b0966-43bd-403b-973a-b05bf57384ea:hold-shift.mp4)

Holding alt/option duplicates shapes.

[opt-drag.mp4](attachment:733c05c2-66c5-492e-9edd-ec6273aa3265:opt-drag.mp4)

Holding ctrl/command toggles snapping.

[cmd-drag.mp4](attachment:be661314-0a9e-4c9b-8bc8-196224656f04:cmd-drag.mp4)

The issue with modifier keys is that they create a race condition. If you try to release the mouse button and a modifier key at the same time, the events will almost always arrive separately.

If the modifier key-up arrives even slightly before the mouse-up, then we lose the modifier’s effect. Without addressing this, users would have to strain and carefully lift one key after the other.

## Small delay

To prevent this, we add a delay before a modifier key is released rather than clearing it immediately:

```tsx
if (info.shiftKey) {
	clearTimeout(this._shiftKeyTimeout)
	this._shiftKeyTimeout = -1
	inputs.setShiftKey(true)
} else if (!info.shiftKey && inputs.getShiftKey() && this._shiftKeyTimeout === -1) {
	this._shiftKeyTimeout = this.timers.setTimeout(this._setShiftKeyTimeout, 150)
}
```

The delay should be long enough to catch the gap between key-up and mouse-up, but short enough that it doesn't feel sticky or slow. In tldraw, this delay is 150ms. The user has that brief period to release both keys simultaneously, or quickly re-press the modifier key to keep the effect.

After 150ms, we clear the effect and dispatch the `key_up` event synthetically:

```tsx
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

In fact, if you’re still holding onto the shape after this, it’s possible to bring the effect back by re-pressing the modifier key. You can feel the 150ms delay by trying to do this as fast as possible:

[opt-drag-re.mp4](attachment:2376d171-1a25-42db-a176-fd8c2933079f:opt-drag-re.mp4)

## Independent timeouts

In tldraw, modifier keys can be composed together. For example, holding option while dragging a shape and then pressing command will create a duplicate and align that duplicate to the axes.

[opt+cmd.mp4](attachment:25683870-24b0-4691-87e3-d0c6458520c5:optcmd.mp4)

For this, timeouts need to be independent; each modifier tracks its own timeout, and each key gets a 150ms delay from when it releases.

```
if (info.shiftKey) {
clearTimeout(this.\_shiftKeyTimeout)
this.\_shiftKeyTimeout = -1
inputs.setShiftKey(true)
} else if (!info.shiftKey && inputs.getShiftKey() && this.\_shiftKeyTimeout === -1) {
this.\_shiftKeyTimeout = this.timers.setTimeout(this.\_setShiftKeyTimeout, 150)
}

if (info.altKey) {
clearTimeout(this.\_altKeyTimeout)
this.\_altKeyTimeout = -1
inputs.setAltKey(true)
} else if (!info.altKey && inputs.getAltKey() && this.\_altKeyTimeout === -1) {
this.\_altKeyTimeout = this.timers.setTimeout(this.\_setAltKeyTimeout, 150)
}
```

## Further reading

This is part of a broader pattern we've found with input handling - where user intent doesn't match event timing.

We use other deferred commitment patterns elsewhere. tldraw's [click state machine](https://tldraw.dev/sdk-features/click-detection) uses timeouts to detect double and triple clicks, waiting to see if another click arrives before committing to a "single click."

And on mobile devices, [pinch gesture detection](https://tldraw.dev/sdk-features/input-handling) waits before deciding whether a two-finger touch is a pinch or a multi-select.
