---
title: Custom tools
created_at: 17/12/2024
updated_at: 17/12/2024
keywords:
  - custom
  - tools
  - statenode
  - tutorial
  - guide
---

This guide explains how to create custom tools in tldraw. Tools handle user interactions like clicks, drags, and keyboard input to create shapes or perform actions.

## Overview

Tools in tldraw are state machines built on `StateNode`. They:

- Handle pointer, keyboard, and other events
- Manage internal states (idle, dragging, etc.)
- Create and modify shapes
- Integrate with the toolbar

## Basic tool structure

```typescript
import { StateNode, TLPointerEventInfo, createShapeId } from '@tldraw/tldraw'

class StampTool extends StateNode {
  static override id = 'stamp'

  override onPointerDown(info: TLPointerEventInfo) {
    const { currentPagePoint } = this.editor.inputs

    this.editor.createShape({
      id: createShapeId(),
      type: 'geo',
      x: currentPagePoint.x - 25,
      y: currentPagePoint.y - 25,
      props: {
        geo: 'star',
        w: 50,
        h: 50,
      },
    })
  }
}
```

## Registering tools

```typescript
import { Tldraw } from '@tldraw/tldraw'

const customTools = [StampTool]

function App() {
  return <Tldraw tools={customTools} />
}
```

## Event handlers

### Pointer events

```typescript
class MyTool extends StateNode {
  // Mouse/touch down
  override onPointerDown(info: TLPointerEventInfo) {}

  // Mouse/touch move
  override onPointerMove(info: TLPointerEventInfo) {}

  // Mouse/touch up
  override onPointerUp(info: TLPointerEventInfo) {}

  // Enter/leave canvas
  override onEnter(info: TLEnterEventHandler) {}
  override onExit(info: TLExitEventHandler) {}
}
```

### Keyboard events

```typescript
class MyTool extends StateNode {
  override onKeyDown(info: TLKeyboardEventInfo) {
    if (info.key === 'Escape') {
      this.editor.setCurrentTool('select')
    }
  }

  override onKeyUp(info: TLKeyboardEventInfo) {}
}
```

### Other events

```typescript
class MyTool extends StateNode {
  // Frame tick (for animations)
  override onTick(elapsed: number) {}

  // Cancel current action
  override onCancel() {}

  // Complete current action
  override onComplete() {}
}
```

## State machines

Complex tools use child states:

```typescript
class DrawingTool extends StateNode {
  static override id = 'drawing'
  static override initial = 'idle'
  static override children = () => [IdleState, DrawingState]
}

class IdleState extends StateNode {
  static override id = 'idle'

  override onPointerDown(info: TLPointerEventInfo) {
    this.parent.transition('drawing', info)
  }
}

class DrawingState extends StateNode {
  static override id = 'drawing'

  private shapeId: TLShapeId | null = null

  override onEnter() {
    const { currentPagePoint } = this.editor.inputs
    this.shapeId = createShapeId()

    this.editor.createShape({
      id: this.shapeId,
      type: 'draw',
      x: currentPagePoint.x,
      y: currentPagePoint.y,
    })
  }

  override onPointerMove() {
    // Update shape with new points
  }

  override onPointerUp() {
    this.shapeId = null
    this.parent.transition('idle')
  }
}
```

## Using editor.inputs

Access current input state:

```typescript
const inputs = this.editor.inputs

// Pointer position
inputs.currentPagePoint  // { x, y } in page coordinates
inputs.currentScreenPoint // { x, y } in screen coordinates

// Pointer state
inputs.isDragging
inputs.isPointing

// Keyboard state
inputs.shiftKey
inputs.ctrlKey
inputs.altKey

// Previous positions
inputs.previousPagePoint
```

## Creating shapes on drag

```typescript
class RectangleTool extends StateNode {
  static override id = 'rectangle'
  static override initial = 'idle'
  static override children = () => [IdleState, CreatingState]
}

class IdleState extends StateNode {
  static override id = 'idle'

  override onPointerDown() {
    this.parent.transition('creating')
  }
}

class CreatingState extends StateNode {
  static override id = 'creating'

  private shapeId: TLShapeId | null = null
  private startPoint: Vec | null = null

  override onEnter() {
    const { currentPagePoint } = this.editor.inputs
    this.startPoint = currentPagePoint.clone()
    this.shapeId = createShapeId()

    this.editor.createShape({
      id: this.shapeId,
      type: 'geo',
      x: currentPagePoint.x,
      y: currentPagePoint.y,
      props: { w: 0, h: 0, geo: 'rectangle' },
    })
  }

  override onPointerMove() {
    if (!this.shapeId || !this.startPoint) return

    const { currentPagePoint } = this.editor.inputs

    const w = currentPagePoint.x - this.startPoint.x
    const h = currentPagePoint.y - this.startPoint.y

    this.editor.updateShape({
      id: this.shapeId,
      type: 'geo',
      x: w < 0 ? currentPagePoint.x : this.startPoint.x,
      y: h < 0 ? currentPagePoint.y : this.startPoint.y,
      props: {
        w: Math.abs(w),
        h: Math.abs(h),
      },
    })
  }

  override onPointerUp() {
    this.shapeId = null
    this.startPoint = null
    this.parent.transition('idle')
  }
}
```

## Adding to toolbar

```typescript
import { TldrawUiMenuItem, useTools } from '@tldraw/tldraw'

function CustomToolbarItem() {
  const tools = useTools()
  const tool = tools['stamp']

  if (!tool) return null

  return (
    <TldrawUiMenuItem
      id={tool.id}
      label="Stamp"
      icon="star"
      onClick={() => tool.onSelect('toolbar')}
      isSelected={tool.isSelected}
    />
  )
}

function CustomToolbar() {
  return (
    <DefaultToolbar>
      <CustomToolbarItem />
    </DefaultToolbar>
  )
}
```

## Tool component

Render UI while tool is active:

```typescript
import { useEditor, track } from '@tldraw/tldraw'

const StampToolComponent = track(function StampToolComponent() {
  const editor = useEditor()
  const isActive = editor.getCurrentToolId() === 'stamp'

  if (!isActive) return null

  return (
    <div style={{
      position: 'absolute',
      top: 10,
      left: 10,
      padding: 8,
      background: 'white',
      borderRadius: 4,
    }}>
      Click anywhere to stamp a star!
    </div>
  )
})

<Tldraw
  tools={[StampTool]}
  components={{
    InFrontOfTheCanvas: StampToolComponent,
  }}
/>
```

## Keyboard shortcuts

Define shortcuts for your tool:

```typescript
class StampTool extends StateNode {
  static override id = 'stamp'
}

// In your overrides
const overrides: TLUiOverrides = {
  tools(editor, tools) {
    tools.stamp = {
      id: 'stamp',
      icon: 'star',
      label: 'Stamp',
      kbd: 's',  // Press 's' to activate
      onSelect: () => editor.setCurrentTool('stamp'),
    }
    return tools
  },
}

<Tldraw
  tools={[StampTool]}
  overrides={overrides}
/>
```

## Example: Line drawing tool

```typescript
class LineTool extends StateNode {
  static override id = 'line'
  static override initial = 'idle'
  static override children = () => [LineIdle, LineDrawing]
}

class LineIdle extends StateNode {
  static override id = 'idle'

  override onPointerDown() {
    this.parent.transition('drawing')
  }
}

class LineDrawing extends StateNode {
  static override id = 'drawing'

  private shapeId: TLShapeId | null = null

  override onEnter() {
    const { currentPagePoint } = this.editor.inputs
    this.shapeId = createShapeId()

    this.editor.createShape({
      id: this.shapeId,
      type: 'line',
      x: currentPagePoint.x,
      y: currentPagePoint.y,
      props: {
        points: {
          a1: { id: 'a1', index: 'a1', x: 0, y: 0 },
          a2: { id: 'a2', index: 'a2', x: 0, y: 0 },
        },
      },
    })
  }

  override onPointerMove() {
    if (!this.shapeId) return

    const shape = this.editor.getShape(this.shapeId)
    if (!shape) return

    const { currentPagePoint } = this.editor.inputs

    this.editor.updateShape({
      id: this.shapeId,
      type: 'line',
      props: {
        points: {
          ...shape.props.points,
          a2: {
            ...shape.props.points.a2,
            x: currentPagePoint.x - shape.x,
            y: currentPagePoint.y - shape.y,
          },
        },
      },
    })
  }

  override onPointerUp() {
    this.shapeId = null
    this.parent.transition('idle')
  }

  override onCancel() {
    if (this.shapeId) {
      this.editor.deleteShape(this.shapeId)
    }
    this.parent.transition('idle')
  }
}
```

## Key files

- packages/editor/src/lib/editor/tools/StateNode.ts - Base class
- packages/tldraw/src/lib/tools/ - Built-in tools
- packages/editor/src/lib/editor/types/event-types.ts - Event types

## Related

- [Tool system](../architecture/tool-system.md) - Architecture overview
- [Custom shapes](./custom-shapes.md) - Creating shapes
- [UI components](../architecture/ui-components.md) - Toolbar customization
