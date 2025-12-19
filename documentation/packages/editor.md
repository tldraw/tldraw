---
title: '@tldraw/editor'
created_at: 12/17/2024
updated_at: 12/17/2024
keywords:
  - editor
  - canvas
  - core
  - engine
---

The `@tldraw/editor` package is the foundational layer of tldraw—a minimal infinite canvas editor without any specific shapes, tools, or UI. It provides the core editing engine that the main `tldraw` package builds upon.

## Overview

This package gives you the canvas engine only. It handles:

- Rendering an infinite, pannable, zoomable canvas
- Processing pointer, keyboard, and touch input
- Managing editor state (selection, camera, history)
- Providing the shape and tool extension systems

It does **not** include:

- Default shapes (rectangles, arrows, text, etc.)
- Default tools (select, draw, erase, etc.)
- User interface (toolbars, menus, panels)

Use this package when building a completely custom canvas application. For a ready-to-use editor with defaults, use `@tldraw/tldraw` instead.

## Installation

```bash
npm install @tldraw/editor
```

You must also import the CSS:

```typescript
import '@tldraw/editor/editor.css'
```

## Basic usage

```tsx
import { TldrawEditor } from '@tldraw/editor'
import '@tldraw/editor/editor.css'

function App() {
	return (
		<div style={{ width: '100vw', height: '100vh' }}>
			<TldrawEditor
				shapeUtils={[]} // Your custom shapes
				tools={[]} // Your custom tools
			/>
		</div>
	)
}
```

Without shapes and tools, you get an empty canvas. See the customization sections below for adding functionality.

## Architecture

### The Editor class

The `Editor` class is the central orchestrator. It manages all editor state and provides the API for programmatic control:

```typescript
function MyComponent() {
	const editor = useEditor()

	// Access state
	const selectedShapes = editor.getSelectedShapes()
	const camera = editor.getCamera()

	// Manipulate shapes
	editor.createShape({ type: 'myShape', x: 0, y: 0, props: {} })
	editor.updateShape({ id: shapeId, props: { color: 'red' } })
	editor.deleteShapes([shapeId])

	// Control the viewport
	editor.zoomIn()
	editor.centerOnPoint({ x: 500, y: 500 })
}
```

The Editor provides methods for:

| Category  | Examples                                                 |
| --------- | -------------------------------------------------------- |
| Shapes    | `createShape`, `updateShape`, `deleteShapes`, `getShape` |
| Selection | `select`, `selectAll`, `selectNone`, `getSelectedShapes` |
| Camera    | `zoomIn`, `zoomOut`, `centerOnPoint`, `setCamera`        |
| History   | `undo`, `redo`, `mark`, `bail`                           |
| Tools     | `setCurrentTool`, `getCurrentTool`                       |
| Pages     | `createPage`, `deletePage`, `setCurrentPage`             |

### Store integration

The Editor wraps a `TLStore` that holds all document data. You can access it directly:

```typescript
const editor = useEditor()

// Listen to changes
editor.store.listen((entry) => {
	console.log('Store changed:', entry)
})

// Access records directly
const allShapes = editor.store.allRecords().filter((r) => r.typeName === 'shape')
```

### Component structure

```tsx
<TldrawEditor>
  └── <Canvas>
        ├── Background
        ├── Grid (optional)
        ├── Shapes (rendered in document order)
        │     └── Shape components from ShapeUtils
        ├── Selection indicators
        ├── Handles
        └── Brush (when selecting)
</TldrawEditor>
```

## Defining shapes with ShapeUtil

Every shape type requires a `ShapeUtil` class that defines its behavior:

```typescript
import { ShapeUtil, Rectangle2d, TLBaseShape } from '@tldraw/editor'

// 1. Define the shape type
type MyShape = TLBaseShape<'myShape', {
  w: number
  h: number
  color: string
}>

// 2. Create the ShapeUtil
class MyShapeUtil extends ShapeUtil<MyShape> {
  static override type = 'myShape' as const

  // Default props for new shapes
  getDefaultProps(): MyShape['props'] {
    return { w: 100, h: 100, color: 'black' }
  }

  // Geometry for hit testing and bounds
  getGeometry(shape: MyShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  // Render the shape
  component(shape: MyShape) {
    return (
      <div
        style={{
          width: shape.props.w,
          height: shape.props.h,
          backgroundColor: shape.props.color,
        }}
      />
    )
  }

  // Render selection indicator
  indicator(shape: MyShape) {
    return <rect width={shape.props.w} height={shape.props.h} />
  }
}
```

### Required ShapeUtil methods

| Method              | Purpose                          |
| ------------------- | -------------------------------- |
| `getDefaultProps()` | Default values for new shapes    |
| `getGeometry()`     | Hit testing, bounds, and outline |
| `component()`       | React component for rendering    |
| `indicator()`       | SVG for selection outline        |

### Optional ShapeUtil methods

| Method            | Purpose                               |
| ----------------- | ------------------------------------- |
| `onResize()`      | Custom resize behavior                |
| `onRotate()`      | Custom rotation behavior              |
| `onDoubleClick()` | Handle double-click                   |
| `onEditEnd()`     | Handle edit mode end                  |
| `canEdit()`       | Whether shape supports editing        |
| `canResize()`     | Whether shape can be resized          |
| `canBind()`       | Whether other shapes can bind to this |

### Registering shapes

Pass your ShapeUtils to the editor:

```tsx
<TldrawEditor shapeUtils={[MyShapeUtil]} />
```

## Defining tools with StateNode

Tools are implemented as hierarchical state machines using `StateNode`:

```typescript
import { StateNode, TLPointerEventInfo } from '@tldraw/editor'

class MyTool extends StateNode {
	static override id = 'myTool'

	onEnter() {
		this.editor.setCursor({ type: 'cross' })
	}

	onPointerDown(info: TLPointerEventInfo) {
		const { x, y } = this.editor.inputs.currentPagePoint
		this.editor.createShape({
			type: 'myShape',
			x,
			y,
		})
	}
}
```

### Tool with child states

Complex tools use child states for different interaction phases:

```typescript
class DrawTool extends StateNode {
	static override id = 'draw'
	static override children = () => [IdleState, DrawingState]
	static override initial = 'idle'
}

class IdleState extends StateNode {
	static override id = 'idle'

	onPointerDown(info: TLPointerEventInfo) {
		this.parent.transition('drawing', info)
	}
}

class DrawingState extends StateNode {
	static override id = 'drawing'

	onPointerMove(info: TLPointerEventInfo) {
		// Update shape as user draws
	}

	onPointerUp(info: TLPointerEventInfo) {
		this.parent.transition('idle')
	}
}
```

### Event handlers

StateNode supports these event handlers:

| Handler           | Trigger                |
| ----------------- | ---------------------- |
| `onEnter()`       | State becomes active   |
| `onExit()`        | State becomes inactive |
| `onPointerDown()` | Mouse/touch down       |
| `onPointerMove()` | Mouse/touch move       |
| `onPointerUp()`   | Mouse/touch up         |
| `onKeyDown()`     | Key pressed            |
| `onKeyUp()`       | Key released           |
| `onWheel()`       | Mouse wheel            |
| `onDoubleClick()` | Double click           |
| `onCancel()`      | Escape pressed         |

### Registering tools

```tsx
<TldrawEditor
	tools={[MyTool, DrawTool]}
	initialState="myTool" // Start with this tool active
/>
```

## Bindings

Bindings create relationships between shapes. The most common use is arrows connecting to shapes.

```typescript
import { BindingUtil, TLBaseBinding } from '@tldraw/editor'

type MyBinding = TLBaseBinding<
	'myBinding',
	{
		anchor: { x: number; y: number }
	}
>

class MyBindingUtil extends BindingUtil<MyBinding> {
	static override type = 'myBinding' as const

	getDefaultProps() {
		return { anchor: { x: 0.5, y: 0.5 } }
	}

	onAfterChangeToShape({ binding }) {
		// Called when the "to" shape changes
		// Update the "from" shape to maintain the connection
	}
}
```

Register bindings:

```tsx
<TldrawEditor bindingUtils={[MyBindingUtil]} />
```

## External content handling

The Editor provides a system for handling external content like pasted text, dropped files, and URLs.

### Content types

| Type         | Description                                    |
| ------------ | ---------------------------------------------- |
| `text`       | Plain text, HTML, or JSON                      |
| `files`      | Dropped or pasted files (images, videos, etc.) |
| `url`        | URLs that might be embeddable                  |
| `svg-text`   | SVG markup as text                             |
| `embed`      | Embeddable content (YouTube, etc.)             |
| `tldraw`     | Native tldraw content                          |
| `excalidraw` | Excalidraw format                              |

### Registering handlers

```typescript
// Handle dropped/pasted text
editor.registerExternalContentHandler('text', async (content) => {
	const { text, point } = content
	editor.createShape({
		type: 'text',
		x: point?.x ?? 0,
		y: point?.y ?? 0,
		props: { text },
	})
})

// Handle dropped files
editor.registerExternalContentHandler('files', async (content) => {
	const { files, point } = content
	for (const file of files) {
		if (file.type.startsWith('image/')) {
			// Create image shape from file
			const assetId = await editor.uploadAsset(file)
			editor.createShape({
				type: 'image',
				x: point?.x ?? 0,
				y: point?.y ?? 0,
				props: { assetId },
			})
		}
	}
})

// Handle URLs
editor.registerExternalContentHandler('url', async (content) => {
	const { url, point } = content
	// Check if URL is embeddable, create embed or bookmark shape
})
```

### Triggering content handling

```typescript
// Programmatically handle external content
await editor.putExternalContent({
	type: 'text',
	text: 'Hello world',
	point: { x: 100, y: 100 },
})

await editor.putExternalContent({
	type: 'files',
	files: [myFile],
	point: { x: 200, y: 200 },
})
```

### Content sources

External content can include source information for traceability:

```typescript
interface TLExternalContentSource {
	type: 'tldraw' | 'excalidraw' | 'text' | 'error'
	data: any
}
```

## Managers

The Editor uses specialized managers for different concerns:

| Manager           | Purpose                      |
| ----------------- | ---------------------------- |
| `HistoryManager`  | Undo/redo stack              |
| `SnapManager`     | Snapping during interactions |
| `FocusManager`    | Keyboard focus handling      |
| `TextManager`     | Text measurement and editing |
| `TickManager`     | Animation frame coordination |
| `ScribbleManager` | Freehand brush effects       |

Access managers through the editor:

```typescript
editor.history.undo()
editor.snaps.getSnapLines()
```

## Customizing components

Override default components via the `components` prop:

```tsx
<TldrawEditor
	components={{
		Cursor: MyCustomCursor,
		Grid: MyCustomGrid,
		Background: MyCustomBackground,
	}}
/>
```

Available component overrides:

- `Canvas` - Main canvas container
- `Background` - Canvas background
- `Grid` - Dot or line grid
- `Cursor` - Mouse cursor
- `Brush` - Selection brush
- `Handles` - Shape resize/rotate handles
- `SelectionBackground` - Selection box background
- `SelectionForeground` - Selection box foreground
- `OnTheCanvas` - Overlay content
- `InFrontOfTheCanvas` - Content above shapes

## Performance considerations

The editor is optimized for performance:

- **Viewport culling**: Only renders shapes in view
- **Reactive updates**: Components re-render only when dependencies change
- **Geometry caching**: Bounds calculations are memoized
- **Batched updates**: Use `editor.batch()` for multiple changes

```typescript
// Batch multiple operations for efficiency
editor.batch(() => {
	editor.createShape(shape1)
	editor.createShape(shape2)
	editor.select(shape1.id, shape2.id)
})
```

## Key files

- packages/editor/src/lib/editor/Editor.ts - Main editor class
- packages/editor/src/lib/editor/shapes/ShapeUtil.ts - Shape definition base
- packages/editor/src/lib/editor/tools/StateNode.ts - Tool state machine base
- packages/editor/src/lib/editor/bindings/BindingUtil.ts - Binding definition base
- packages/editor/src/lib/TldrawEditor.tsx - React component wrapper
- packages/editor/src/lib/components/ - Default component implementations

## Related

- [Architecture overview](../overview/architecture-overview.md) - How editor fits in the SDK
- [@tldraw/tldraw](./tldraw.md) - Complete SDK with defaults
- [@tldraw/store](./store.md) - Underlying data store
- [Shape system](../architecture/shape-system.md) - Deep dive into shapes
- [Tool system](../architecture/tool-system.md) - Deep dive into tools
