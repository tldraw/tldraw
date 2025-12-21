---
title: Dot-separated path transitions
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - state machines
  - transitions
  - nested states
  - crop
---

# Dot-separated path transitions

When you click a resize handle while holding Ctrl in tldraw, the select tool transitions from `idle` to crop mode with `this.parent.transition('crop.pointing_crop_handle', info)`. That dot in the middle isn't just naming convention—it's a multi-level state transition that walks through the hierarchy, exiting old states and entering new ones along the way.

Here's how nested state transitions work in tldraw's state machine system.

## The transition mechanism

The `transition` method accepts a dot-separated path and processes it level by level:

```typescript
transition(id: string, info: any = {}) {
    const path = id.split('.')
    let currState = this as StateNode

    for (let i = 0; i < path.length; i++) {
        const id = path[i]
        const prevChildState = currState.getCurrent()
        const nextChildState = currState.children?.[id]

        if (!nextChildState) {
            throw Error(`${currState.id} - no child state exists with the id ${id}.`)
        }

        if (prevChildState?.id !== nextChildState.id) {
            prevChildState?.exit(info, id)
            currState._current.set(nextChildState)
            nextChildState.enter(info, prevChildState?.id || 'initial')
            if (!nextChildState.getIsActive()) break
        }

        currState = nextChildState
    }

    return this
}
```

The path `'crop.pointing_crop_handle'` gets split into `['crop', 'pointing_crop_handle']`. The method starts at the select tool and walks each segment. At each level, it:

1. Finds the next child state by ID
2. If transitioning to a different child, exits the old one
3. Sets the new child as current
4. Enters the new child, passing event info through
5. Moves down one level and repeats

If the new child isn't active after entering (maybe it rejected the transition), the walk stops. Otherwise it continues to the next segment.

A single-level transition like `'idle'` just processes one segment. A multi-level transition like `'crop.pointing_crop_handle'` processes two. You can go as deep as your hierarchy allows.

## Enter and exit cascades

When a state exits, it exits its entire subtree. When a state enters, it enters down to the initial leaf state. This happens automatically.

The `exit` method:

```typescript
exit(info: any, to: string) {
    if (debugFlags.measurePerformance.get() && this.performanceTracker.isStarted()) {
        this.performanceTracker.stop()
    }
    this._isActive.set(false)
    this.onExit?.(info, to)

    if (!this.getIsActive()) {
        this.getCurrent()?.exit(info, to)
    }
}
```

After marking itself inactive and calling `onExit`, it exits its current child state. That child exits its child, and so on down the tree. A single exit at the top cascades through every active state below.

The `enter` method works the opposite way:

```typescript
enter(info: any, from: string) {
    if (debugFlags.measurePerformance.get() && STATE_NODES_TO_MEASURE.includes(this.id)) {
        this.performanceTracker.start(this.id)
    }

    this._isActive.set(true)
    this.onEnter?.(info, from)

    if (this.children && this.initial && this.getIsActive()) {
        const initial = this.children[this.initial]
        this._current.set(initial)
        initial.enter(info, from)
    }
}
```

After marking itself active and calling `onEnter`, if this is a branch node with an initial child, it enters that child. The child enters its initial child, continuing until reaching a leaf state.

This means entering a parent state automatically enters its entire initial subtree. You don't manage the hierarchy manually—just enter the parent and the rest follows.

## The Crop state example

The select tool has a child state called `Crop` that manages the cropping interaction:

```typescript
export class Crop extends StateNode {
    static override id = 'crop'
    static override initial = 'idle'
    static override children(): TLStateNodeConstructor[] {
        return [Idle, TranslatingCrop, PointingCrop, PointingCropHandle, Cropping]
    }

    markId = ''
    didExit = false

    override onEnter() {
        this.didExit = false
        this.markId = this.editor.markHistoryStoppingPoint('crop')
    }

    override onExit() {
        if (!this.didExit) {
            this.didExit = true
            this.editor.squashToMark(this.markId)
        }
    }

    override onCancel() {
        if (!this.didExit) {
            this.didExit = true
            this.editor.bailToMark(this.markId)
        }
    }
}
```

When you transition to `crop.pointing_crop_handle`, the transition:

1. Exits whatever select tool child was active (probably `idle`)
2. Enters `crop`, which calls `onEnter` and creates a history mark
3. Since we specified a child explicitly, enters `pointing_crop_handle` directly (skipping the default `idle`)

The full path becomes `select.crop.pointing_crop_handle`. All three states are active. Events cascade from select to crop to pointing_crop_handle.

When crop mode ends (either through completion or cancellation), exiting the `crop` state triggers `onExit`, which squashes all changes since the mark into a single undo step. If cancelled with Escape, `onCancel` fires instead and bails to the mark, reverting everything.

This parent state pattern gives you a single place to handle lifecycle concerns for an entire subtree. Every child state benefits from the same history management without implementing it themselves.

## Automatic initial state entry

If you transition to just `'crop'` without specifying a child, the `enter` method sees that crop is a branch node with `initial = 'idle'` and automatically enters that child:

```typescript
if (this.children && this.initial && this.getIsActive()) {
    const initial = this.children[this.initial]
    this._current.set(initial)
    initial.enter(info, from)
}
```

This works recursively. If the initial child is also a branch with its own initial child, entering continues down until reaching a leaf. You can enter anywhere in the hierarchy and the tree fills itself in below that point.

The check `this.getIsActive()` allows a state to reject activation in `onEnter` by marking itself inactive. If that happens, the automatic descent stops and no child states enter.

## Where this lives

The core implementation:

- `packages/editor/src/lib/editor/tools/StateNode.ts` - Base class with transition, enter, exit methods (lines 151-219)
- `packages/tldraw/src/lib/tools/SelectTool/childStates/Crop/Crop.ts` - Parent state example with history management
- `packages/tldraw/src/lib/tools/SelectTool/childStates/Idle.ts` - Uses `crop.pointing_crop_handle` transition (line 385)

The dot-separated path syntax turns nested transitions into a single operation. You write `transition('crop.pointing_crop_handle')` instead of manually exiting the current state, entering crop, then entering pointing_crop_handle. The hierarchy management happens automatically, and enter/exit hooks fire in the right order throughout the tree.
