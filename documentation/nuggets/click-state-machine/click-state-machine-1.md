---
title: State machine for multi-click detection
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - click
  - state
  - machine
status: published
date: 12/21/2025
order: 0
---

# A state machine for click detection

If you've ever tried to detect double-clicks in a web app, you've probably written something like this:

```typescript
let clickCount = 0
let clickTimeout: number

function onPointerUp() {
	clickCount++
	clearTimeout(clickTimeout)
	clickTimeout = setTimeout(() => {
		if (clickCount === 1) handleSingleClick()
		else if (clickCount === 2) handleDoubleClick()
		else if (clickCount === 3) handleTripleClick()
		clickCount = 0
	}, 300)
}
```

It seems reasonable. But in tldraw we needed triple-clicks for selecting paragraphs, quadruple-clicks for selecting all text, and we needed to distinguish clicks from drags. The naive approach quickly becomes timeout spaghetti—counters, flags, and race conditions that interact in surprising ways.

We replaced all of it with an explicit state machine.

## The six states

Our ClickManager has six states:

```typescript
type TLClickState =
	| 'idle'
	| 'pendingDouble'
	| 'pendingTriple'
	| 'pendingQuadruple'
	| 'pendingOverflow'
	| 'overflow'
```

Each state represents where we are in a click sequence:

- `idle` — No recent clicks, waiting for the first one
- `pendingDouble` — One click happened, waiting to see if a second follows
- `pendingTriple` — Two clicks happened (double-click emitted), waiting for a third
- `pendingQuadruple` — Three clicks happened (triple-click emitted), waiting for a fourth
- `pendingOverflow` — Four clicks happened (quadruple-click emitted), waiting for a fifth
- `overflow` — Five or more clicks, no further advancement

The `overflow` state caps the sequence. Without it, we'd keep emitting click events forever as users mash the mouse button.

## Transitions on pointer down

The state machine advances on pointer down, not pointer up. This is important—it means tools can respond immediately when they detect a multi-click:

```typescript
switch (this._clickState) {
	case 'idle': {
		this._clickState = 'pendingDouble'
		break
	}
	case 'pendingDouble': {
		this._clickState = 'pendingTriple'
		return {
			...info,
			type: 'click',
			name: 'double_click',
			phase: 'down',
		}
	}
	case 'pendingTriple': {
		this._clickState = 'pendingQuadruple'
		return {
			...info,
			type: 'click',
			name: 'triple_click',
			phase: 'down',
		}
	}
	// ... continues for quadruple_click
}
```

The first click transitions from `idle` to `pendingDouble` but just returns the normal pointer_down event. The second click transitions to `pendingTriple` and emits `double_click`. Text selection can start immediately on that down event, not after waiting for the pointer to come back up.

## Why this beats counters

The naive counter approach has hidden states. When `clickCount` is 2, you don't know if the user is:

- In the middle of clicking (waiting for pointer up)
- Done clicking (timeout hasn't fired yet)
- Dragging (moved too far from the click point)

With explicit states, each situation is named and handled separately. Adding quintuple-click support would mean adding one new state and two transitions—no refactoring of existing logic.

The state machine also makes testing straightforward. We can verify each transition independently, mock timers to test timeouts without real delays, and check that stale timeouts don't dispatch incorrect events.
