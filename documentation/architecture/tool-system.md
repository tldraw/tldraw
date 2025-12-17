---
title: Tool system
created_at: 17/12/2024
updated_at: 17/12/2024
keywords:
  - tools
  - state machines
  - StateNode
  - interactions
  - events
---

Tools are how users interact with the canvas in tldraw. Every interaction—selecting shapes, drawing arrows, panning the viewport—is handled by a tool. This document explains how the tool system works, from the StateNode architecture to building custom tools.

## Overview

The tool system in tldraw is built on hierarchical state machines. Each tool is a `StateNode` that responds to events (pointer, keyboard, wheel) and manages interaction state. Tools can have child states for complex multi-stage interactions, and the system handles state transitions, event routing, and cleanup automatically.

Key concepts:

- **StateNode** - Base class for all tools and states
- **Hierarchical states** - Tools can have child states for complex interactions
- **Event-driven** - Tools respond to pointer, keyboard, and other events
- **Root state** - Top-level state that contains all tools
- **Tool registration** - Adding tools to the editor via the `tools` prop

The system provides:

- Clean separation between tools
- Automatic event routing to the active tool
- State transition management with enter/exit hooks
- Input state tracking via `editor.inputs`
- Tool locking for rapid shape creation

## StateNode class

Every tool extends `StateNode`, which implements a hierarchical finite state machine. StateNode handles state management, event routing, and transitions between states.

### Basic structure

```typescript
import { StateNode } from '@tldraw/editor'

class MyTool extends StateNode {
  static override id = 'myTool'

  onEnter() {
    // Called when tool becomes active
    this.editor.setCursor({ type: 'cross', rotation: 0 })
  }

  onExit() {
    // Called when tool becomes inactive
    this.editor.setCursor({ type: 'default', rotation: 0 })
  }

  onPointerDown(info: TLPointerEventInfo) {
    // Handle pointer down event
    const { x, y } = this.editor.inputs.getCurrentPagePoint()
    this.editor.createShape({
      type: 'geo',
      x,
      y,
    })
  }
}
```

### Static properties

StateNode classes define their configuration via static properties:

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique identifier for this state (required) |
| `initial` | `string` | ID of the default child state (for branch nodes) |
| `children` | `() => TLStateNodeConstructor[]` | Function returning child state classes |
| `isLockable` | `boolean` | Whether this tool supports tool locking (default: true) |
| `useCoalescedEvents` | `boolean` | Whether to use coalesced pointer events (default: false) |

### State types

StateNode automatically determines its type based on configuration:

- **Root** - Top-level state (no parent)
- **Branch** - Has both `children` and `initial` defined
- **Leaf** - No children, handles events directly

```typescript
// Branch node with child states
class DrawTool extends StateNode {
  static override id = 'draw'
  static override initial = 'idle'
  static override children = () => [Idle, Drawing]
}

// Leaf node without children
class Idle extends StateNode {
  static override id = 'idle'

  onPointerDown(info: TLPointerEventInfo) {
    this.parent.transition('drawing', info)
  }
}
```

### State transitions

Use `transition()` to move between child states:

```typescript
// Transition to a child state
this.parent.transition('drawing', info)

// Transition to a nested child state
this.parent.transition('crop.pointing_crop_handle', info)

// Transition with custom data
this.parent.transition('translating', {
  ...info,
  isCreating: true,
  onCreate: () => console.log('Shape created!')
})
```

When transitioning:

1. Current state's `onExit()` is called
2. Current state's `_isActive` is set to false
3. New state's `_isActive` is set to true
4. New state's `onEnter()` is called
5. If the new state has children, its initial child is entered

### Lifecycle methods

StateNode provides lifecycle hooks for managing state:

```typescript
class MyState extends StateNode {
  onEnter(info: any, from: string) {
    // Called when entering this state
    // info: data passed from transition()
    // from: ID of the previous state
  }

  onExit(info: any, to: string) {
    // Called when exiting this state
    // info: data passed to transition()
    // to: ID of the next state
  }
}
```

These hooks are ideal for:

- Setting cursors
- Initializing state variables
- Starting/stopping animations
- Cleaning up resources

## Event handling

StateNode supports event handlers for all user interactions. Events are routed through the state hierarchy automatically.

### Pointer events

Handle mouse and touch interactions:

```typescript
class MyTool extends StateNode {
  onPointerDown(info: TLPointerEventInfo) {
    // Mouse/touch down
    const { target, point, button, isPen } = info

    // target: 'canvas' | 'shape' | 'selection' | 'handle'
    if (target === 'canvas') {
      const pagePoint = this.editor.inputs.getCurrentPagePoint()
      // Create shape at cursor position
    }
  }

  onPointerMove(info: TLPointerEventInfo) {
    // Mouse/touch move
    // Update preview, drag shape, etc.
  }

  onPointerUp(info: TLPointerEventInfo) {
    // Mouse/touch up
    // Complete interaction
  }

  onLongPress(info: TLPointerEventInfo) {
    // Long press (touch and hold)
    // Show context menu, etc.
  }

  onRightClick(info: TLPointerEventInfo) {
    // Right mouse button click
  }

  onMiddleClick(info: TLPointerEventInfo) {
    // Middle mouse button click
  }
}
```

The `TLPointerEventInfo` object contains:

- `type` - Always `'pointer'`
- `name` - Event name (`'pointer_down'`, `'pointer_move'`, etc.)
- `point` - Cursor position in client space
- `pointerId` - Pointer identifier for multi-touch
- `button` - Mouse button (0=left, 1=middle, 2=right)
- `isPen` - Whether this is a pen/stylus
- `target` - What was clicked (`'canvas'`, `'shape'`, `'selection'`, `'handle'`)
- `shape` - The shape that was clicked (if target is `'shape'` or `'handle'`)
- `handle` - The handle that was clicked (if target is `'handle'`)
- `shiftKey`, `altKey`, `ctrlKey`, `metaKey`, `accelKey` - Modifier keys

### Click events

Handle multi-click interactions:

```typescript
class MyTool extends StateNode {
  onDoubleClick(info: TLClickEventInfo) {
    // Double click
    if (info.phase === 'up') {
      // Start editing shape, open dialog, etc.
    }
  }

  onTripleClick(info: TLClickEventInfo) {
    // Triple click
  }

  onQuadrupleClick(info: TLClickEventInfo) {
    // Quadruple click
  }
}
```

Click events have a `phase` property:

- `'down'` - First pointer down
- `'up'` - Final pointer up
- `'settle'` - Short delay after up (ideal for animations)

### Keyboard events

Handle keyboard input:

```typescript
class MyTool extends StateNode {
  onKeyDown(info: TLKeyboardEventInfo) {
    // Key pressed
    const { key, code, shiftKey, altKey, ctrlKey } = info

    if (code === 'Escape') {
      this.editor.selectNone()
    }
  }

  onKeyUp(info: TLKeyboardEventInfo) {
    // Key released
  }

  onKeyRepeat(info: TLKeyboardEventInfo) {
    // Key held down (repeating)
    // Ideal for arrow key nudging
  }
}
```

The `TLKeyboardEventInfo` object contains:

- `type` - Always `'keyboard'`
- `name` - Event name (`'key_down'`, `'key_up'`, `'key_repeat'`)
- `key` - Key value (e.g., `'a'`, `'Enter'`, `'ArrowLeft'`)
- `code` - Key code (e.g., `'KeyA'`, `'Enter'`, `'ArrowLeft'`)
- Modifier key flags

### Other events

Additional event handlers:

```typescript
class MyTool extends StateNode {
  onWheel(info: TLWheelEventInfo) {
    // Mouse wheel / trackpad scroll
    const { delta } = info
  }

  onCancel(info: TLCancelEventInfo) {
    // Escape key pressed or similar cancellation
    this.parent.transition('idle')
  }

  onComplete(info: TLCompleteEventInfo) {
    // Interaction completed (e.g., Enter key)
  }

  onInterrupt(info: TLInterruptEventInfo) {
    // Tool was interrupted (user switched to another tool)
  }

  onTick(info: TLTickEventInfo) {
    // Animation frame (60fps when active)
    const { elapsed } = info
  }
}
```

### Event routing

Events flow through the state hierarchy:

1. Event occurs (e.g., pointer down)
2. Root state's handler is called
3. If handler doesn't stop propagation, event goes to current child
4. Child's handler is called
5. Process repeats down the hierarchy

This allows:

- Parent tools to handle common behavior
- Child states to handle specific interactions
- Different behavior at different interaction stages

```typescript
class SelectTool extends StateNode {
  static override id = 'select'
  static override initial = 'idle'
  static override children = () => [Idle, Translating]

  // Handles event first, then passes to active child
  onPointerDown(info: TLPointerEventInfo) {
    // Common selection logic
  }
}

class Idle extends StateNode {
  static override id = 'idle'

  // Handles event only when Idle is active
  onPointerDown(info: TLPointerEventInfo) {
    // Start translation
    this.parent.transition('translating', info)
  }
}
```

## Input state tracking

The `editor.inputs` object provides access to current input state. This is essential for tools that need to know about modifier keys, cursor position, or what buttons are pressed.

### Pointer position

Get current and previous pointer positions:

```typescript
// Current position
const pagePoint = this.editor.inputs.getCurrentPagePoint()
const screenPoint = this.editor.inputs.getCurrentScreenPoint()

// Previous position (for calculating delta)
const prevPagePoint = this.editor.inputs.getPreviousPagePoint()
const prevScreenPoint = this.editor.inputs.getPreviousScreenPoint()

// Initial pointer down position
const originPagePoint = this.editor.inputs.getOriginPagePoint()
const originScreenPoint = this.editor.inputs.getOriginScreenPoint()
```

Coordinate spaces:

- **Page space** - Canvas coordinates (accounts for zoom and pan)
- **Screen space** - Browser viewport coordinates (raw pixel positions)

### Modifier keys

Check modifier key state:

```typescript
const shiftKey = this.editor.inputs.getShiftKey()
const altKey = this.editor.inputs.getAltKey()
const ctrlKey = this.editor.inputs.getCtrlKey()

// Cmd on Mac, Ctrl on Windows/Linux
const accelKey = this.editor.inputs.getAccelKey()
```

The `accelKey` is particularly useful for cross-platform shortcuts.

### Button state

Check what mouse buttons are pressed:

```typescript
const isPointerDown = this.editor.inputs.getIsPointerDown()
const isDragging = this.editor.inputs.getIsDragging()
const isPen = this.editor.inputs.getIsPen()
```

### Keys set

Access all currently pressed keys:

```typescript
const keys = this.editor.inputs.keys

if (keys.has('ArrowLeft')) {
  // Arrow left is pressed
}

if (keys.has('ShiftLeft')) {
  // Left shift key is pressed (not the generic "shift")
}
```

The `keys` set uses physical key codes, allowing differentiation between left and right modifier keys.

### Input state example

```typescript
class NudgeTool extends StateNode {
  onKeyRepeat(info: TLKeyboardEventInfo) {
    const { keys } = this.editor.inputs

    // Use physical shift key state for precise control
    const shiftKey = keys.has('ShiftLeft') || keys.has('ShiftRight')
    const step = shiftKey ? 10 : 1

    const delta = new Vec(0, 0)
    if (keys.has('ArrowLeft')) delta.x -= step
    if (keys.has('ArrowRight')) delta.x += step
    if (keys.has('ArrowUp')) delta.y -= step
    if (keys.has('ArrowDown')) delta.y += step

    const selectedIds = this.editor.getSelectedShapeIds()
    this.editor.nudgeShapes(selectedIds, delta)
  }
}
```

## Child states and state hierarchies

Complex tools use child states to manage different phases of an interaction. This keeps code organized and makes transitions explicit.

### Simple tool with child states

```typescript
class HandTool extends StateNode {
  static override id = 'hand'
  static override initial = 'idle'
  static override children = () => [Idle, Pointing, Dragging]
}

class Idle extends StateNode {
  static override id = 'idle'

  onPointerDown(info: TLPointerEventInfo) {
    this.parent.transition('pointing', info)
  }
}

class Pointing extends StateNode {
  static override id = 'pointing'

  onPointerMove(info: TLPointerEventInfo) {
    // Start dragging if pointer moved enough
    if (this.editor.inputs.getIsDragging()) {
      this.parent.transition('dragging', info)
    }
  }

  onPointerUp() {
    this.parent.transition('idle')
  }
}

class Dragging extends StateNode {
  static override id = 'dragging'

  onPointerMove() {
    // Pan the canvas
    const delta = this.editor.inputs.getCurrentScreenPoint()
      .sub(this.editor.inputs.getPreviousScreenPoint())
    this.editor.pan(delta)
  }

  onPointerUp() {
    this.parent.transition('idle')
  }
}
```

### Nested child states

States can nest arbitrarily deep:

```typescript
class SelectTool extends StateNode {
  static override id = 'select'
  static override initial = 'idle'
  static override children = () => [Idle, Crop, Translating]
}

class Crop extends StateNode {
  static override id = 'crop'
  static override initial = 'idle'
  static override children = () => [CropIdle, Cropping, PointingCropHandle]
}

// Transition to nested state
this.parent.transition('crop.pointing_crop_handle', info)
```

Dot notation navigates the hierarchy. The editor handles entering intermediate states automatically.

### State data flow

Pass data between states via the info parameter:

```typescript
class PointingShape extends StateNode {
  onPointerMove(info: TLPointerEventInfo) {
    if (this.editor.inputs.getIsDragging()) {
      this.parent.transition('translating', {
        ...info,
        isCreating: false,
        onInteractionEnd: 'select',
      })
    }
  }
}

class Translating extends StateNode {
  info: any

  onEnter(info: any) {
    this.info = info

    if (info.isCreating) {
      // Handle shape creation
    }

    if (info.onInteractionEnd) {
      // Set tool mask for UI
      this.parent.setCurrentToolIdMask(info.onInteractionEnd)
    }
  }
}
```

### Why use child states?

Child states provide:

- **Clear interaction phases** - Each phase has its own state
- **Explicit transitions** - Easy to understand state flow
- **Isolated concerns** - Each state handles one thing
- **Better debugging** - Current state visible in dev tools
- **Cleaner code** - No complex conditionals or flags

## Root state and tool registration

The root state sits at the top of the state hierarchy and contains all tools. Tools register with the editor and become children of the root state.

### Root state structure

```typescript
class RootState extends StateNode {
  static override id = 'root'
  static override initial = ''
  static override children = () => []
}
```

The root state is minimal—its main job is containing tools. The editor populates its children with registered tools.

### Registering tools

Pass tools to the editor via the `tools` prop:

```typescript
import { TldrawEditor } from '@tldraw/editor'
import { SelectTool, HandTool, DrawTool } from './tools'

function MyEditor() {
  return (
    <TldrawEditor
      tools={[SelectTool, HandTool, DrawTool]}
      initialState="select"
    />
  )
}
```

The editor:

1. Instantiates each tool class
2. Adds them as children of the root state
3. Transitions to the `initialState`

### Setting the current tool

Switch tools programmatically:

```typescript
// Switch to a tool
editor.setCurrentTool('hand')

// Switch with custom data
editor.setCurrentTool('draw', {
  shapeType: 'geo',
  style: { color: 'red' }
})

// Get current tool
const currentTool = editor.getCurrentTool()
const toolId = editor.getCurrentToolId() // Returns 'hand', 'select', etc.
```

The `setCurrentTool()` method calls `root.transition()` internally, triggering the standard state transition flow.

### Tool shortcuts

Keyboard shortcuts typically switch tools:

```typescript
class RootState extends StateNode {
  onKeyDown(info: TLKeyboardEventInfo) {
    switch (info.code) {
      case 'KeyV': {
        this.editor.setCurrentTool('select')
        break
      }
      case 'KeyH': {
        this.editor.setCurrentTool('hand')
        break
      }
      case 'KeyD': {
        this.editor.setCurrentTool('draw')
        break
      }
    }
  }
}
```

In tldraw, keyboard shortcuts are handled by the UI layer, but custom implementations can handle them in the root state or via editor event listeners.

### Default tools in tldraw

The `@tldraw/tldraw` package provides these default tools:

```typescript
import { defaultTools } from '@tldraw/tldraw'

// defaultTools includes:
// - SelectTool
// - HandTool
// - EraserTool
// - LaserTool
// - ZoomTool
```

Plus tool classes for each shape type (DrawTool, GeoTool, ArrowTool, etc.).

## Creating custom tools

Let's walk through creating a custom tool step-by-step.

### Simple tool: stamp tool

Create a tool that stamps a shape on click:

```typescript
import { StateNode, TLPointerEventInfo, createShapeId } from '@tldraw/editor'

export class StampTool extends StateNode {
  static override id = 'stamp'

  override onEnter() {
    this.editor.setCursor({ type: 'cross', rotation: 0 })
  }

  override onPointerDown(info: TLPointerEventInfo) {
    if (info.target !== 'canvas') return

    const { x, y } = this.editor.inputs.getCurrentPagePoint()

    this.editor.markHistoryStoppingPoint('stamp shape')
    this.editor.createShape({
      id: createShapeId(),
      type: 'geo',
      x: x - 50,
      y: y - 50,
      props: {
        w: 100,
        h: 100,
        geo: 'star',
        color: 'blue',
      },
    })
  }
}
```

Register it:

```typescript
<TldrawEditor
  tools={[StampTool, ...defaultTools]}
  initialState="select"
/>
```

### Complex tool: shape creation

Create a tool that draws shapes by clicking and dragging:

```typescript
class GeoTool extends StateNode {
  static override id = 'geo'
  static override initial = 'idle'
  static override children = () => [Idle, Pointing]
}

class Idle extends StateNode {
  static override id = 'idle'

  override onEnter() {
    this.editor.setCursor({ type: 'cross', rotation: 0 })
  }

  override onPointerDown(info: TLPointerEventInfo) {
    this.parent.transition('pointing', info)
  }
}

class Pointing extends StateNode {
  static override id = 'pointing'

  shapeId = ''
  markId = ''

  override onEnter() {
    const { x, y } = this.editor.inputs.getCurrentPagePoint()

    this.markId = this.editor.markHistoryStoppingPoint('create geo')
    this.shapeId = createShapeId()

    this.editor.createShape({
      id: this.shapeId,
      type: 'geo',
      x,
      y,
      props: { w: 1, h: 1, geo: 'rectangle' },
    })
  }

  override onPointerMove() {
    const shape = this.editor.getShape(this.shapeId)
    if (!shape) return

    const { x, y } = shape
    const currentPoint = this.editor.inputs.getCurrentPagePoint()
    const originPoint = this.editor.inputs.getOriginPagePoint()

    const w = currentPoint.x - originPoint.x
    const h = currentPoint.y - originPoint.y

    this.editor.updateShape({
      id: this.shapeId,
      type: 'geo',
      x: w < 0 ? currentPoint.x : x,
      y: h < 0 ? currentPoint.y : y,
      props: {
        w: Math.abs(w),
        h: Math.abs(h),
      },
    })
  }

  override onPointerUp() {
    const shape = this.editor.getShape(this.shapeId)

    if (!shape || (shape.props.w < 5 && shape.props.h < 5)) {
      // Too small, delete it
      this.editor.bailToMark(this.markId)
    } else {
      // Keep it and select it
      this.editor.select(this.shapeId)
    }

    // Return to idle (or stay if tool locked)
    const isToolLocked = this.editor.getInstanceState().isToolLocked
    if (isToolLocked && shape) {
      this.parent.transition('idle')
    } else {
      this.editor.setCurrentTool('select')
    }
  }

  override onCancel() {
    this.editor.bailToMark(this.markId)
    this.parent.transition('idle')
  }
}
```

This demonstrates:

- Multi-state interaction (idle → pointing)
- Shape creation and updates
- History management (mark and bail)
- Tool locking support
- Cancellation handling

### Tool with BaseBoxShapeTool

For rectangular shapes, extend `BaseBoxShapeTool` to get standard box-drawing behavior:

```typescript
import { BaseBoxShapeTool } from '@tldraw/editor'

export class CardTool extends BaseBoxShapeTool {
  static override id = 'card'
  override shapeType = 'card' as const
}
```

BaseBoxShapeTool provides:

- Click to create default-sized shape
- Drag to create custom-sized shape
- Tool locking support
- History management

You only need to specify the shape type.

### Tool best practices

When creating tools:

1. **Use descriptive IDs** - Tool IDs appear in the UI and debugging
2. **Set cursors** - Always set appropriate cursors in `onEnter()`
3. **Handle cancellation** - Implement `onCancel()` to clean up
4. **Mark history** - Use `markHistoryStoppingPoint()` before mutations
5. **Bail on errors** - Use `bailToMark()` to undo failed operations
6. **Support tool locking** - Check `isToolLocked` after completing interaction
7. **Check targets** - Verify `info.target` before handling pointer events
8. **Clean up** - Remove temporary shapes/state in `onExit()`

## SelectTool complexity

The SelectTool is the most complex default tool. It handles selection, translation, resizing, rotating, and editing—all within one tool hierarchy.

### SelectTool structure

```typescript
class SelectTool extends StateNode {
  static override id = 'select'
  static override initial = 'idle'
  static override isLockable = false

  static override children = () => [
    Idle,
    PointingCanvas,
    PointingShape,
    PointingSelection,
    PointingHandle,
    PointingResizeHandle,
    PointingRotateHandle,
    PointingCropHandle,
    PointingArrowLabel,
    Brushing,
    ScribbleBrushing,
    Translating,
    Resizing,
    Rotating,
    Crop,
    Cropping,
    EditingShape,
    DraggingHandle,
  ]
}
```

That's 17 child states, each handling a specific interaction mode.

### Idle state routing

The Idle state routes pointer events to appropriate child states:

```typescript
class Idle extends StateNode {
  onPointerDown(info: TLPointerEventInfo) {
    switch (info.target) {
      case 'canvas': {
        // Check if we actually hit a shape
        const hitShape = getHitShapeOnCanvasPointerDown(this.editor)
        if (hitShape) {
          this.parent.transition('pointing_shape', info)
        } else {
          this.parent.transition('pointing_canvas', info)
        }
        break
      }

      case 'shape': {
        this.parent.transition('pointing_shape', info)
        break
      }

      case 'handle': {
        this.parent.transition('pointing_handle', info)
        break
      }

      case 'selection': {
        // Selection box edge/corner/rotate handle
        if (info.handle === 'mobile_rotate' ||
            info.handle === 'top_left_rotate') {
          this.parent.transition('pointing_rotate_handle', info)
        } else {
          this.parent.transition('pointing_resize_handle', info)
        }
        break
      }
    }
  }
}
```

### Pointing states

"Pointing" states handle the initial pointer down and decide what to do on move:

```typescript
class PointingShape extends StateNode {
  onPointerMove(info: TLPointerEventInfo) {
    if (this.editor.inputs.getIsDragging()) {
      this.parent.transition('translating', info)
    }
  }

  onPointerUp(info: TLPointerEventInfo) {
    // Just select the shape
    selectOnPointerUp(this.editor, info)
    this.parent.transition('idle')
  }
}

class PointingCanvas extends StateNode {
  onPointerMove(info: TLPointerEventInfo) {
    if (this.editor.inputs.getIsDragging()) {
      this.parent.transition('brushing', info)
    }
  }

  onPointerUp() {
    this.editor.selectNone()
    this.parent.transition('idle')
  }
}
```

The "pointing" pattern avoids accidental drags when the user just wants to click.

### Interaction states

Once committed to an interaction, dedicated states take over:

- **Translating** - Moves selected shapes, handles cloning with Alt
- **Resizing** - Resizes shapes via corner/edge handles
- **Rotating** - Rotates shapes via rotation handles
- **Brushing** - Drag-select multiple shapes with rectangular brush
- **ScribbleBrushing** - Drag-select with freehand lasso
- **Cropping** - Crop images via crop handles
- **EditingShape** - Edit text or other editable shapes
- **DraggingHandle** - Drag custom shape handles (e.g., arrow endpoints)

Each state encapsulates the logic for its interaction, including:

- Pointer move handling
- Visual feedback (cursor, indicators)
- Snapping behavior
- History management
- Cleanup and transition back to idle

### Why so many states?

Breaking SelectTool into many states:

- **Keeps code maintainable** - Each file handles one thing
- **Enables clear transitions** - Easy to see interaction flow
- **Supports testing** - Test individual states in isolation
- **Improves debugging** - Current state visible in tools panel
- **Allows customization** - Override specific states without rewriting everything

The complexity is inherent to selection—SelectTool is really multiple tools in one.

## Tool locking

Tool locking lets users stay in a tool after completing an interaction, enabling rapid creation of multiple shapes.

### How it works

```typescript
// User toggles tool lock (typically with 'Q' key)
editor.updateInstanceState({
  isToolLocked: !editor.getInstanceState().isToolLocked
})

// In your tool
class Pointing extends StateNode {
  onPointerUp() {
    const shape = this.editor.getShape(this.shapeId)
    const isToolLocked = this.editor.getInstanceState().isToolLocked

    if (isToolLocked && shape) {
      // Stay in tool, return to idle state
      this.parent.transition('idle')
    } else {
      // Return to select tool
      this.editor.setCurrentTool('select')
    }
  }
}
```

### Tool locking support

Control whether a tool supports locking:

```typescript
class MyTool extends StateNode {
  static override id = 'myTool'
  static override isLockable = true  // Default
}

class SelectTool extends StateNode {
  static override id = 'select'
  static override isLockable = false  // Can't lock selection tool
}
```

Setting `isLockable = false` prevents the tool from being locked.

### UI integration

The tldraw UI shows a lock icon for lockable tools and respects the `isToolLocked` state. Custom UIs should:

- Display lock state visually
- Provide a toggle (typically 'Q' keyboard shortcut)
- Only show lock option for lockable tools

### Best practices

For shape creation tools:

1. Check `isToolLocked` after completing a shape
2. If locked, transition to your tool's idle state
3. If not locked, transition to `'select'`
4. Always support cancellation (Escape key)
5. Set `isLockable = true` (the default)

For utility tools (hand, zoom, eraser):

1. Usually set `isLockable = false`
2. These tools typically auto-return to previous tool when done

## Key files

The tool system spans several key files:

### Core state system

- packages/editor/src/lib/editor/tools/StateNode.ts - StateNode base class
- packages/editor/src/lib/editor/tools/RootState.ts - Root state implementation
- packages/editor/src/lib/editor/types/event-types.ts - Event type definitions
- packages/editor/src/lib/editor/managers/InputsManager/InputsManager.ts - Input state tracking

### Default tools

- packages/tldraw/src/lib/defaultTools.ts - Default tool exports
- packages/tldraw/src/lib/tools/SelectTool/SelectTool.ts - Select tool
- packages/tldraw/src/lib/tools/SelectTool/childStates/Idle.ts - Select tool idle state
- packages/tldraw/src/lib/tools/SelectTool/childStates/Translating.ts - Translation state
- packages/tldraw/src/lib/tools/HandTool/HandTool.ts - Hand tool
- packages/tldraw/src/lib/tools/EraserTool/EraserTool.ts - Eraser tool

### Base tools

- packages/editor/src/lib/editor/tools/BaseBoxShapeTool/BaseBoxShapeTool.ts - Base class for rectangular shape tools
- packages/editor/src/lib/editor/tools/BaseBoxShapeTool/children/Pointing.ts - Box drawing interaction

### Editor integration

- packages/editor/src/lib/editor/Editor.ts - Editor class with `setCurrentTool()` and `getCurrentTool()`
- packages/editor/src/lib/TldrawEditor.tsx - Main editor component with tools prop

## Related

- [@tldraw/editor](../packages/editor.md) - Core editor package overview
- [Shape system](./shape-system.md) - How shapes work in tldraw
- [State management](./state-management.md) - Reactive state with signals
- [Event system](./event-system.md) - Event flow and processing
