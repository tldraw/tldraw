---
title: Architecture overview
created_at: 17/12/2024
updated_at: 17/12/2024
keywords:
  - architecture
  - sdk
  - layers
  - design
---

This document explains how tldraw's SDK is architected, how the packages relate to each other, and the key design patterns used throughout the codebase.

## Three-layer architecture

The tldraw SDK uses a three-layer architecture that separates concerns and allows progressive customization:

```
┌─────────────────────────────────────────────────────────┐
│                    @tldraw/tldraw                       │
│                                                         │
│  Complete SDK: default shapes, tools, and UI           │
│  "Batteries included" - most developers use this       │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    @tldraw/editor                       │
│                                                         │
│  Canvas engine: rendering, input, state management     │
│  No shapes, tools, or UI - just the foundation         │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│          @tldraw/store + @tldraw/state                  │
│                                                         │
│  Data layer: reactive records and signals              │
│  Framework-agnostic state management                   │
└─────────────────────────────────────────────────────────┘
```

### Layer 1: @tldraw/tldraw

The top layer provides a complete, production-ready editor. It includes:

- **Default shapes**: geo, draw, text, arrow, note, frame, image, video, embed, bookmark, highlight, line
- **Default tools**: select, hand, draw, eraser, arrow, text, note, laser, frame, and shape-specific tools
- **Complete UI**: toolbar, menus, style panel, pages, zoom controls, context menus
- **External content handling**: paste, drag-and-drop, embeds, bookmarks

Most applications use this layer directly:

```tsx
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

function App() {
  return <Tldraw />
}
```

### Layer 2: @tldraw/editor

The middle layer provides the canvas engine without any default content. It handles:

- **Rendering**: Canvas drawing, viewport management, SVG export
- **Input**: Pointer events, keyboard handling, gestures
- **State coordination**: Tool state machines, selection, history
- **Shape system**: ShapeUtil base class for defining shape behavior
- **Binding system**: BindingUtil for shape relationships

Use this layer when building a completely custom editor:

```tsx
import { TldrawEditor } from '@tldraw/editor'
import '@tldraw/editor/editor.css'

function App() {
  return (
    <TldrawEditor
      shapeUtils={myCustomShapes}
      tools={myCustomTools}
    />
  )
}
```

### Layer 3: @tldraw/store + @tldraw/state

The bottom layer provides reactive data management:

- **@tldraw/state**: Signals system with Atoms and Computed values
- **@tldraw/store**: Record-based database with queries and side effects

These packages are framework-agnostic and can be used independently of the editor.

## Core concepts

### The Editor class

The `Editor` class is the central orchestrator. It:

- Manages the store (all document data)
- Coordinates tools and input handling
- Provides the API for programmatic manipulation
- Handles rendering and viewport

Access the editor instance to interact with the canvas:

```typescript
function MyComponent() {
  const editor = useEditor()

  // Create a shape
  editor.createShape({ type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

  // Access state
  const selectedShapes = editor.getSelectedShapes()
}
```

### Reactive state with signals

All state in tldraw is reactive, built on the signals pattern:

```typescript
// Atoms hold mutable state
const count = atom('count', 0)

// Computed values derive from other signals
const doubled = computed('doubled', () => count.get() * 2)

// Reading a signal inside another creates a dependency
// When count changes, doubled automatically updates
```

The editor uses signals extensively. Most getter methods return reactive values that update automatically when underlying data changes.

### The Store

The **store** is a reactive database holding all document data as typed records:

| Record type | Purpose |
|-------------|---------|
| `TLShape` | All shapes on the canvas |
| `TLPage` | Document pages |
| `TLAsset` | Images, videos, bookmarks |
| `TLBinding` | Connections between shapes |
| `TLCamera` | Viewport position per page |
| `TLInstance` | Editor instance state |
| `TLInstancePageState` | Per-page selection and focus |

Records have **scopes** that determine sync and persistence behavior:

| Scope | Synced | Persisted | Examples |
|-------|--------|-----------|----------|
| `document` | Yes | Yes | Shapes, pages, assets |
| `session` | No | Maybe | User preferences |
| `presence` | Yes | No | Cursors, selections |

### ShapeUtil: defining shapes

Every shape type has a corresponding `ShapeUtil` class that defines its behavior:

```typescript
class GeoShapeUtil extends ShapeUtil<TLGeoShape> {
  static type = 'geo' as const

  // Define hit testing and bounds
  getGeometry(shape: TLGeoShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h })
  }

  // Render the shape
  component(shape: TLGeoShape) {
    return <rect width={shape.props.w} height={shape.props.h} />
  }

  // Render selection indicator
  indicator(shape: TLGeoShape) {
    return <rect width={shape.props.w} height={shape.props.h} />
  }
}
```

### StateNode: defining tools

Tools are implemented as hierarchical state machines using `StateNode`:

```typescript
class DrawTool extends StateNode {
  static id = 'draw'
  static children = () => [Idle, Drawing]
  static initial = 'idle'
}

class Idle extends StateNode {
  static id = 'idle'

  onPointerDown(info: TLPointerEventInfo) {
    this.parent.transition('drawing', info)
  }
}

class Drawing extends StateNode {
  static id = 'drawing'

  onPointerMove(info: TLPointerEventInfo) {
    // Update the shape being drawn
  }

  onPointerUp(info: TLPointerEventInfo) {
    this.parent.transition('idle')
  }
}
```

### Bindings: shape relationships

Bindings connect shapes together. The most common example is arrows binding to shapes:

```typescript
class ArrowBindingUtil extends BindingUtil<TLArrowBinding> {
  static type = 'arrow' as const

  onAfterChangeToShape({ binding, shapeAfter }) {
    // Update arrow when bound shape moves
  }
}
```

When a shape moves, the binding system automatically updates connected arrows.

## Data flow

### User interaction flow

```
User Input (pointer/keyboard)
        │
        ▼
    Editor.dispatch()
        │
        ▼
    Current Tool (StateNode)
        │
        ▼
    Editor methods (createShape, updateShape, etc.)
        │
        ▼
    Store.put() / Store.update()
        │
        ▼
    Side Effects (bindings, validation)
        │
        ▼
    Reactive Updates (UI re-renders)
```

### Rendering flow

```
Store Changes
        │
        ▼
    Reactive Queries
        │
        ▼
    Shape Components
        │
        ▼
    Canvas Rendering
```

Components subscribe to reactive state. When records change, only affected components re-render.

## Extension points

The SDK provides several extension mechanisms:

| Extension | Use case |
|-----------|----------|
| Custom shapes | New shape types via ShapeUtil |
| Custom tools | New tools via StateNode |
| Custom bindings | Shape relationships via BindingUtil |
| UI overrides | Replace any UI component |
| Side effects | React to store changes |
| External content | Handle paste/drop/embed |

## Performance design

Several patterns ensure good performance:

- **Reactive signals** minimize re-renders by tracking precise dependencies
- **Viewport culling** only renders shapes visible in the viewport
- **Geometry caching** avoids recalculating bounds unnecessarily
- **Batched updates** via transactions prevent cascading re-computations
- **History pruning** prevents unbounded memory growth

## Key files

- packages/editor/src/lib/editor/Editor.ts - Main editor class
- packages/editor/src/lib/editor/shapes/ShapeUtil.ts - Shape definition base class
- packages/editor/src/lib/editor/tools/StateNode.ts - Tool state machine base class
- packages/store/src/lib/Store.ts - Reactive record store
- packages/state/src/lib/Atom.ts - Mutable signal implementation
- packages/state/src/lib/Computed.ts - Derived signal implementation

## Related

- [Repository overview](./repository-overview.md) - Monorepo structure and packages
- [Getting started](./getting-started.md) - Development environment setup
- [@tldraw/editor](../packages/editor.md) - Core editor package details
- [@tldraw/tldraw](../packages/tldraw.md) - Complete SDK package details
