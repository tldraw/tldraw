# Three phases of a click event

When you double-click to edit text in tldraw, the selection highlight appears immediately—before your finger leaves the mouse button. That instant feedback matters for making the canvas feel responsive. But we also need to know if the double-click turns into a drag, and we need a moment when we're sure the click sequence is complete.

We solve this by giving every multi-click event three phases: `down`, `up`, and `settle`.

## The phases

```typescript
type TLClickEventInfo = {
  type: 'click'
  name: 'double_click' | 'triple_click' | 'quadruple_click'
  phase: 'down' | 'up' | 'settle'
  point: VecLike
  // ...
}
```

Each phase fires at a different moment:

**down** fires immediately when the pointer goes down and we recognize the multi-click. A double-click `down` event fires on the second pointer down. This is when tools show immediate visual feedback—text selection starts, shapes prepare for editing.

**up** fires when the pointer releases, confirming the click wasn't a drag. Tools can update their visual state, knowing the user completed the click rather than starting to move something.

**settle** fires when a timeout expires and no further clicks are coming. This is the moment for final, irreversible actions like opening dialogs or committing edits.

## How tools use phases

The SelectTool's Idle state shows a typical pattern:

```typescript
override onDoubleClick(info: TLClickEventInfo) {
  if (this.editor.inputs.getShiftKey() || info.phase !== 'up') return

  // Only handle the up phase for final actions
  // ...
}
```

Most tools filter for a specific phase. Responding to `down` gives instant feedback but risks acting on a drag. Responding to `settle` ensures the sequence is complete but adds latency. The `up` phase is a middle ground—fast enough to feel responsive, but only fires if the pointer didn't move too far.

For text shapes, triple-click uses the `settle` phase to confirm paragraph selection. We show the selection on `down`, but if a fourth click comes, we switch to selecting all text instead. The `settle` phase tells us the user stopped at three clicks.

## Position tracking

The `up` and `settle` phases use the position captured on `down`, not the current pointer position:

```typescript
// In handlePointerEvent for pointer_up:
return {
  ...this.lastPointerInfo,  // Position from pointer_down
  type: 'click',
  name: 'double_click',
  phase: 'up',
}
```

This matters because fingers and mice drift during clicks. A double-click should report the position where the user clicked, not where their pointer happened to drift by release time.

## Why three phases

We could have just fired the event once on pointer up. But that creates a tradeoff between responsiveness and correctness. Fire too early and you might act on what turns out to be a drag. Wait too long and the UI feels sluggish.

Three phases let different parts of the system choose their own tradeoff. Fast visual feedback on `down`, confident state updates on `up`, final actions on `settle`. Each handler picks the phase that matches what it's trying to do.

## Key files

- `packages/editor/src/lib/editor/managers/ClickManager/ClickManager.ts` — Phase emission logic (lines 99-222)
- `packages/editor/src/lib/editor/types/event-types.ts` — TLClickEventInfo type definition (line 73)
- `packages/tldraw/src/lib/tools/SelectTool/childStates/Idle.ts` — Example of phase filtering in tools (lines 169-356)
