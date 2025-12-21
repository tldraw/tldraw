---
title: Click detection state machine
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - click
  - state
  - machine
---

# Click detection state machine

Double-click to edit text. Triple-click to select a paragraph. These interactions feel natural, but detecting them is surprisingly tricky. Most implementations devolve into nested timeouts and boolean flags—a mess that's hard to reason about and easy to break. tldraw uses a proper state machine instead.

## The timeout spaghetti problem

A naive click detector might look like this:

```typescript
// Don't do this
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

This breaks down quickly. What if the user moves the pointer between clicks? What about distinguishing clicks from drags? What happens during the timeout—do we wait or respond immediately? Add quadruple-click support and the conditionals multiply. Add drag detection and the booleans proliferate.

## States instead of flags

The `ClickManager` models click detection as a finite state machine with six states:

```typescript
type TLClickState =
  | 'idle'
  | 'pendingDouble'
  | 'pendingTriple'
  | 'pendingQuadruple'
  | 'pendingOverflow'
  | 'overflow'
```

Each state represents a point in the click sequence. `idle` means no recent clicks. `pendingDouble` means one click happened and we're waiting to see if another follows. The pattern continues through triple and quadruple, then enters `overflow` where additional clicks no longer advance the count.

State transitions happen on pointer down:

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
  // ...
}
```

The first click transitions from `idle` to `pendingDouble` without emitting anything special—it's just a regular pointer down. The second click transitions to `pendingTriple` and emits a `double_click` event. This pattern continues up the chain.

## Different timeouts for different clicks

Double-click detection uses a longer timeout than subsequent multi-clicks. After the first click, users get 450ms to click again for a double-click. But once they're in a double-click sequence, they only get 200ms between clicks to continue to triple and quadruple:

```typescript
state === 'idle' || state === 'pendingDouble'
  ? this.editor.options.doubleClickDurationMs   // 450ms
  : this.editor.options.multiClickDurationMs    // 200ms
```

This matches operating system conventions. People double-click deliberately, but triple and quadruple clicks are rapid-fire actions—usually selecting a word then extending to a sentence or paragraph.

## Event phases

Click events have three phases: `down`, `up`, and `settle`.

The `down` phase fires immediately when the pointer goes down and the click sequence advances. This lets tools respond instantly—text selection highlights immediately on double-click down, not after the finger lifts.

The `up` phase fires when the pointer releases, confirming the click completed without turning into a drag.

The `settle` phase fires when the timeout expires. If someone double-clicks and then stops, the `settle` event confirms "yes, that was definitely a double-click, and nothing more is coming." Tools use this for final actions like opening dialogs or completing text selection.

## Race condition prevention

What if two rapid click sequences overlap? A unique ID prevents confusion:

```typescript
_getClickTimeout(state: TLClickState, id = uniqueId()) {
  this._clickId = id
  // ...
  this._clickTimeout = this.editor.timers.setTimeout(() => {
    if (this._clickState === state && this._clickId === id) {
      // Only fire if we're still in the same sequence
    }
  }, duration)
}
```

Each timeout captures its sequence ID. When the timeout fires, it checks that both the state and ID still match. If the user started a new click sequence, the ID won't match and the stale timeout does nothing.

## Spatial tolerance

Clicks in a sequence must happen near each other. Moving the pointer more than 40 pixels resets to `idle`:

```typescript
const MAX_CLICK_DISTANCE = 40

if (
  this._previousScreenPoint &&
  Vec.Dist2(this._previousScreenPoint, this._clickScreenPoint) > MAX_CLICK_DISTANCE ** 2
) {
  this._clickState = 'idle'
}
```

The squared distance comparison avoids an expensive square root—a small optimization that adds up when processing every pointer event.

## Click versus drag

Pointer movement during a potential click cancels the sequence. The threshold differs between mouse and touch:

```typescript
case 'pointer_move': {
  if (
    this._clickState !== 'idle' &&
    this._clickScreenPoint &&
    Vec.Dist2(this._clickScreenPoint, this.editor.inputs.getCurrentScreenPoint()) >
      (this.editor.getInstanceState().isCoarsePointer
        ? this.editor.options.coarseDragDistanceSquared  // 36 (6px)
        : this.editor.options.dragDistanceSquared)       // 16 (4px)
  ) {
    this.cancelDoubleClickTimeout()
  }
}
```

Touch input uses a larger threshold (6 pixels) because fingers are imprecise. Mouse input uses a tighter threshold (4 pixels). Moving beyond these limits cancels the click sequence and lets drag handling take over.

## The state machine advantage

With explicit states, the logic becomes auditable. You can trace exactly how `idle` becomes `pendingTriple`—it's a defined transition, not an emergent property of nested conditionals. Adding new behavior means adding states and transitions, not untangling boolean combinations.

The approach does require more code than the naive version. But that code is comprehensible, testable, and doesn't break when requirements change. For input handling—where subtle bugs create maddening user experiences—that tradeoff is worthwhile.

## Key files

- `packages/editor/src/lib/editor/managers/ClickManager/ClickManager.ts` — State machine implementation
- `packages/editor/src/lib/options.ts` — Timing configuration (doubleClickDurationMs, multiClickDurationMs)
- `packages/editor/src/lib/editor/types/event-types.ts` — TLClickEventInfo and phase definitions
