````markdown
# CONTEXT.md - @tldraw/editor Package

This file provides comprehensive context for understanding the `@tldraw/editor` package, the core infinite canvas editor for tldraw.

## Package Overview

The `@tldraw/editor` package is the foundational layer of tldraw - a minimal infinite canvas editor without any specific shapes, tools, or UI. It provides the core editing engine that the main `tldraw` package builds upon.

**Key Distinction:** This package provides the editor engine only. For a complete editor with shapes and UI, use `@tldraw/tldraw` instead.

**Version:** 3.15.1  
**Compatibility:** Requires Node.js ^20.0.0, React ^18.0.0  
**Bundle:** Ships with separate CSS file (`editor.css`) that must be imported

## Architecture Overview

### Core Components

**1. Editor Class (`src/lib/editor/Editor.ts`)**

- Central orchestrator for all editor functionality
- Manages the store, camera, selection, tools, and rendering
- Implements the main API surface for programmatic interaction
- Event-driven architecture using EventEmitter3
- Reactive state management using `@tldraw/state` signals

**2. TldrawEditor Component (`src/lib/TldrawEditor.tsx`)**

- Main React component that renders the editor
- Handles store creation, loading states, error boundaries
- Manages editor lifecycle and mounting
- Provides theming (light/dark mode) and licensing

**3. Store Integration**

- Uses `@tldraw/store` for reactive data persistence
- Supports local IndexedDB persistence via `persistenceKey`
- Can accept external stores or create internal ones
- Handles loading states and sync status

### State Management Architecture

**Reactive Signals System:**

- Uses `@tldraw/state` for reactive state management
- Atoms for mutable state, Computed for derived state
- Automatic dependency tracking and efficient updates
- All editor state is reactive and observable

**Store Structure:**

- Document data stored in `TLStore` (shapes, pages, assets, etc.)
- Editor state (camera, selection, tools) stored separately
- Derivations compute dependent values efficiently
- History management with undo/redo support

### Tools and State System

**StateNode Architecture (`src/lib/editor/tools/StateNode.ts`)**

- Hierarchical finite state machine for tools
- Each tool is a StateNode with potential child states
- Event-driven with handlers for pointer, keyboard, tick events
- Supports both "branch" nodes (with children) and "leaf" nodes

**Tool Types:**

- Root state manages overall editor state
- Tool states handle specific user interactions
- Child states for complex tools (e.g., drawing, resizing)
- Configurable tool state charts

### Shape System

**ShapeUtil Architecture (`src/lib/editor/shapes/ShapeUtil.ts`)**

- Abstract base class for defining shape behavior
- Each shape type needs a corresponding ShapeUtil
- Handles rendering, geometry, interactions, and serialization
- Extensible system for custom shapes

**Key Shape Methods:**

- `getGeometry()` - Shape's geometric representation
- `component()` - React component for rendering
- `indicator()` - Selection indicator rendering
- `onResize()`, `onRotate()` - Interaction handlers

### Binding System

**BindingUtil Architecture (`src/lib/editor/bindings/BindingUtil.ts`)**

- Abstract base class for defining relationships between shapes
- Manages connections like arrows to shapes, text to shapes, etc.
- Handles binding creation, updates, and cleanup
- Each binding type needs a corresponding BindingUtil

**Key Binding Concepts:**

- Bindings connect shapes through relationships
- `fromId` and `toId` reference connected shapes
- BindingUtils define visual indicators and interaction behavior
- Automatically updated when connected shapes change

### Manager System

The editor uses specialized managers for different concerns:

**Core Managers:**

- `ClickManager` - Multi-click detection and handling
- `EdgeScrollManager` - Auto-scroll at viewport edges during interactions
- `FocusManager` - Focus state and keyboard event handling
- `FontManager` - Font loading and management
- `HistoryManager` - Undo/redo functionality
- `ScribbleManager` - Brush/scribble interactions
- `SnapManager` - Shape snapping during interactions
- `TextManager` - Text measurement and rendering
- `TickManager` - Animation frame management
- `UserPreferencesManager` - User settings persistence

### Component System

**Default Components (`src/lib/components/default-components/`)**

- Minimal implementations for all editor UI elements
- Canvas, cursors, handles, selection indicators, grid
- Error fallbacks and loading screens
- Fully customizable via `components` prop

**Key Components:**

- `DefaultCanvas` - Main drawing surface
- `DefaultCursor` - Mouse cursor rendering
- `DefaultHandles` - Shape resize/rotate handles
- `DefaultSelectionBackground/Foreground` - Selection UI
- `DefaultGrid` - Viewport grid overlay

**Indicators System (`src/lib/components/default-components/DefaultSelectionBackground.tsx`)**

- Visual feedback for shape selection and interaction states
- Includes selection boxes, rotation handles, and resize handles
- Shape-specific indicators defined in ShapeUtil.indicator()
- Binding indicators for relationship visualization

### Text Editing Integration

**Tiptap Integration:**

- Uses `@tiptap/core` and related packages for rich text editing
- Provides collaborative text editing capabilities
- Handles text formatting, selection, and cursor management
- Integrates with tldraw's event system and state management

**Text Manager (`src/lib/editor/managers/TextManager.ts`):**

- Handles text measurement and font metrics
- Manages text input states and focus
- Coordinates with Tiptap editor instances
- Provides text layout and wrapping calculations

### Geometry and Math

**Primitive System (`src/lib/primitives/`)**

- `Vec` - 2D vector math
- `Mat` - 2D transformation matrices
- `Box` - Axis-aligned bounding boxes
- Geometry2d classes for shape collision/intersection
- Comprehensive math utilities for canvas operations

**Geometry Classes:**

- `Rectangle2d`, `Circle2d`, `Polygon2d`, etc.
- Hit testing and intersection calculations
- Point-in-shape and shape-shape collision detection

### Event System

**Event Flow:**

1. DOM events captured by editor container
2. Processed through pointer/keyboard managers
3. Dispatched to current tool's StateNode
4. Tool updates editor state accordingly
5. Reactive system triggers re-renders

**Event Types:**

- Pointer events (down, move, up) with target detection
- Keyboard events with modifier key handling
- Wheel events for zooming/panning
- Tick events for animations

### Export and Serialization

**Export Capabilities:**

- SVG export with full shape fidelity
- PNG/JPEG export via canvas rendering
- Snapshot serialization for persistence
- Asset handling (images, videos, fonts)

**Deep Links:**

- URL-based state synchronization
- Camera position and selected shapes in URL
- Configurable deep link behavior

### Licensing and Watermark

**License Management:**

- Handles tldraw licensing and watermark display
- `LicenseProvider` and `LicenseManager` components
- Watermark removal with valid business license
- License validation and enforcement

## Key Files and Directories

### Core Implementation

- `src/lib/editor/Editor.ts` - Main editor class
- `src/lib/TldrawEditor.tsx` - React component wrapper
- `src/lib/config/createTLStore.ts` - Store creation and configuration
- `src/lib/options.ts` - Editor configuration options

### Tools and State

- `src/lib/editor/tools/StateNode.ts` - State machine base class
- `src/lib/editor/tools/RootState.ts` - Root state implementation
- `src/lib/editor/tools/BaseBoxShapeTool/` - Base tool for box shapes

### Shape System

- `src/lib/editor/shapes/ShapeUtil.ts` - Shape utility base class
- `src/lib/editor/shapes/BaseBoxShapeUtil.tsx` - Base for rectangular shapes
- `src/lib/editor/shapes/group/GroupShapeUtil.tsx` - Group shape implementation

### Binding System

- `src/lib/editor/bindings/BindingUtil.ts` - Binding utility base class

### Managers

- `src/lib/editor/managers/` - All manager implementations
- `src/lib/editor/managers/ClickManager.ts` - Multi-click handling
- `src/lib/editor/managers/EdgeScrollManager.ts` - Auto-scroll functionality
- `src/lib/editor/managers/FocusManager.ts` - Focus state management
- `src/lib/editor/managers/FontManager.ts` - Font loading and management
- `src/lib/editor/managers/HistoryManager.ts` - Undo/redo functionality
- `src/lib/editor/managers/ScribbleManager.ts` - Brush interactions
- `src/lib/editor/managers/SnapManager.ts` - Shape snapping
- `src/lib/editor/managers/TextManager.ts` - Text measurement and rendering
- `src/lib/editor/managers/TickManager.ts` - Animation frame management
- `src/lib/editor/managers/UserPreferencesManager.ts` - User settings

### Components and Indicators

- `src/lib/components/default-components/` - Default UI components
- `src/lib/components/default-components/DefaultCanvas.tsx` - Main drawing surface
- `src/lib/components/default-components/DefaultCursor.tsx` - Mouse cursor rendering
- `src/lib/components/default-components/DefaultHandles.tsx` - Shape handles
- `src/lib/components/default-components/DefaultSelectionBackground.tsx` - Selection indicators
- `src/lib/components/default-components/DefaultGrid.tsx` - Viewport grid

### Testing Infrastructure

- `src/test/TestEditor.ts` - Editor testing utilities and mocks
- `src/test/` - Integration tests and test helpers

### Utilities

- `src/lib/utils/` - Editor-specific utilities
- `src/lib/primitives/` - Math and geometry utilities
- `src/lib/hooks/` - React hooks for editor integration

## Development Patterns

### Creating Custom Shapes

```typescript
class MyShapeUtil extends ShapeUtil<TLMyShape> {
  static override type = 'my-shape' as const

  getGeometry(shape: TLMyShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
    })
  }

  component(shape: TLMyShape) {
    return <div>My Shape Content</div>
  }

  indicator(shape: TLMyShape) {
    return <rect width={shape.props.w} height={shape.props.h} />
  }
}
```
````

### Creating Custom Tools

```typescript
export class MyTool extends StateNode {
	static override id = 'my-tool'

	onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	onPointerDown(info: TLPointerEventInfo) {
		this.editor.createShape({
			id: createShapeId(),
			type: 'my-shape',
			x: info.point.x,
			y: info.point.y,
		})
	}
}
```

### State Management

```typescript
// Access reactive state
const selectedShapes = editor.getSelectedShapes()
const bounds = editor.getSelectionPageBounds()

// Subscribe to changes
editor.store.listen((entry) => {
	console.log('Store changed:', entry)
})

// Use transactions for atomic updates
editor.batch(() => {
	editor.createShape(shape1)
	editor.createShape(shape2)
	editor.selectAll()
})
```

### Testing Patterns

```typescript
import { TestEditor } from './test/TestEditor'

describe('MyFeature', () => {
	let editor: TestEditor

	beforeEach(() => {
		editor = new TestEditor()
	})

	it('should create shapes', () => {
		editor.createShape({ type: 'geo', id: ids.box1 })
		expect(editor.getOnlySelectedShape()).toBe(editor.getShape(ids.box1))
	})
})
```

## Dependencies

**Runtime Dependencies:**

- `@tldraw/state` ^3.15.1 - Reactive state management
- `@tldraw/state-react` ^3.15.1 - React integration for state
- `@tldraw/store` ^3.15.1 - Document store
- `@tldraw/tlschema` ^3.15.1 - Type definitions and migrations
- `@tldraw/utils` ^3.15.1 - Shared utilities
- `@tldraw/validate` ^3.15.1 - Schema validation
- `@tiptap/core` ^2.6.6 - Rich text editing foundation
- `@tiptap/react` ^2.6.6 - React integration for Tiptap
- `@tiptap/pm` ^2.6.6 - ProseMirror integration
- `@use-gesture/react` ^10.3.1 - Touch/gesture handling
- `classnames` ^2.5.1 - CSS class utility
- `core-js` ^3.39.0 - JavaScript polyfills
- `eventemitter3` ^5.0.1 - Event system
- `idb` ^8.0.0 - IndexedDB wrapper
- `is-plain-object` ^5.0.0 - Object type checking

**Key Peer Dependencies:**

- `react` ^18.0.0 - Required React version
- `react-dom` ^18.0.0 - Required React DOM version

## CSS and Styling

**CSS Bundle:**

- Ships with `editor.css` containing all core styles
- Uses CSS custom properties for theming
- Separate from tldraw.css (which includes shape styles)
- Must be imported: `import '@tldraw/editor/editor.css'`

**Styling Approach:**

- CSS-in-JS for dynamic styles (selections, cursors)
- Static CSS for layout and base component styles
- Theme variables for light/dark mode switching
- Minimal external styling dependencies

## Performance Considerations

**Reactive System Optimization:**

- Reactive system minimizes unnecessary re-renders through precise dependency tracking
- Computed values are cached and only recalculated when dependencies change
- Store changes are batched to prevent cascading updates
- Component re-renders are minimized through React memo and signal integration

**Rendering Performance:**

- Geometry calculations are cached and memoized using shape geometry cache
- Large shape counts handled via viewport culling - only visible shapes are rendered
- Canvas rendering optimized for 60fps interactions with efficient paint cycles
- SVG export uses virtualization for large documents
- Font loading is managed asynchronously to prevent layout shifts during text rendering

**Memory Management:**

- Unused shape utilities are garbage collected
- Event listeners are properly cleaned up on component unmount
- Large assets are handled with lazy loading and disposal
- Store history is pruned to prevent unbounded memory growth

## Extensibility Points

**Highly Customizable:**

- Shape definitions via ShapeUtil
- Binding definitions via BindingUtil
- Tool behavior via StateNode
- UI components via components prop
- Event handling via editor instance
- Styling via CSS custom properties

**Less Customizable:**

- Core editor logic and data flow
- Store structure and reactivity system
- Basic event processing pipeline
- Text editing integration with Tiptap

```

```
