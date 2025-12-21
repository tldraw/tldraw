---
title: Hierarchical event routing
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - state
  - events
  - routing
  - hierarchy
---

# Hierarchical event routing

In tldraw's state machine, events flow through a hierarchy of states. A pointer down while selecting might hit the root state, then SelectTool, then the Idle child state. Each level gets a chance to handle the event before passing it down.

The routing pattern is parent-first. When an event arrives, we call the handler on the current state (the parent) before passing it to the child. This ordering matters because the parent might transition to a different child entirely, and we need to know which child should receive the event.

## Parent-first routing

Here's the core event handling method from `StateNode.ts`:

```typescript
handleEvent(info: Exclude<TLEventInfo, TLPinchEventInfo>) {
    const cbName = EVENT_NAME_MAP[info.name]
    const currentActiveChild = this._current.__unsafe__getWithoutCapture()

    // Handle at parent level first
    this[cbName]?.(info as any)

    // Then pass to child if conditions are met
    if (
        this._isActive.__unsafe__getWithoutCapture() &&
        currentActiveChild &&
        currentActiveChild === this._current.__unsafe__getWithoutCapture()
    ) {
        currentActiveChild.handleEvent(info)
    }
}
```

The method captures the current child before calling the parent's handler. Then it checks three conditions before passing the event down:

1. Is this state still active?
2. Was there a child state when we started?
3. Is the current child still the same child we captured?

That third check is the interesting one.

## Why check if the child changed

When the parent handles an event, it might call `this.parent.transition()` to switch to a different child state. If that happens, we don't want the old child to receive the event—it's no longer active.

Consider the SelectTool's Idle state handling a pointer down on the canvas. The Idle state's `onPointerDown` method examines the click target and transitions to PointingCanvas:

```typescript
override onPointerDown(info: TLPointerEventInfo) {
    switch (info.target) {
        case 'canvas': {
            const hitShape = getHitShapeOnCanvasPointerDown(this.editor)
            if (hitShape && !hitShape.isLocked) {
                // Recursive call with different target
                this.onPointerDown({ ...info, shape: hitShape, target: 'shape' })
                return
            }
            this.parent.transition('pointing_canvas', info)
            break
        }
        // ... other cases
    }
}
```

Once `transition` is called, the active child changes from Idle to PointingCanvas. The comparison `currentActiveChild === this._current.__unsafe__getWithoutCapture()` fails, and we don't try to pass the event to Idle (which is no longer active).

This prevents the old state from processing events after it's been replaced. Without this check, stale states could execute logic that conflicts with the new state's assumptions.

## When the child stays the same

If the parent doesn't transition, the comparison succeeds and the event continues down the hierarchy. This is the common case—most events pass through unchanged.

For example, when you're actively dragging shapes (in the Translating state), pointer move events flow through SelectTool (which does nothing) and reach Translating, which updates the shape positions. The parent had no reason to intervene, so it just forwards the event.

This pattern repeats at every level. Each node can handle the event, potentially transition, and then decide whether to forward it based on what happened.

## The `__unsafe__getWithoutCapture` detail

The method uses `__unsafe__getWithoutCapture()` instead of `.get()` to read reactive signals. This bypasses the dependency tracking in tldraw's reactive system.

Normally, calling `.get()` on a signal registers a dependency—the current computation will re-run if that signal changes. But `handleEvent` isn't called from within the reactive system. It's triggered by DOM events (clicks, pointer moves, key presses). Registering dependencies here would leak memory and serve no purpose.

The `__unsafe__` prefix signals that you're opting out of reactivity. In this case, we just need the current value without the tracking overhead.

## Why parent-first instead of child-first

We could route events child-first—let the leaf state handle it, then bubble up to the parent. Some UI frameworks work this way.

We chose parent-first because parents need the authority to redirect events. In the canvas pointer-down example, the parent (Idle) examines the click and determines which child should handle it. That decision happens in the parent's `onPointerDown` handler before any child sees the event.

If we routed child-first, Idle would be both the parent and the active child (since it's a leaf state). The recursion would get confusing. Parent-first keeps the routing direction simple: events flow down the tree, and each level gets to decide whether to continue.

## Where this lives

Event routing is in `packages/editor/src/lib/editor/tools/StateNode.ts`. The `handleEvent` method is around line 178. Event type mappings (converting `'pointer_down'` to `'onPointerDown'`) are in `packages/editor/src/lib/editor/types/event-types.ts`.

Individual tools demonstrate the pattern:
- `packages/tldraw/src/lib/tools/SelectTool/childStates/Idle.ts` shows complex routing in `onPointerDown` (line 54)
- `packages/tldraw/src/lib/tools/SelectTool/childStates/PointingCanvas.ts` shows simpler forwarding

The parent-first pattern appears throughout the codebase wherever state transitions happen during event handling. It's a small detail that prevents subtle bugs around state lifetimes.
