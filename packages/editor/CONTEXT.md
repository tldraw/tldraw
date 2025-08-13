# CONTEXT.md - @tldraw/editor Package

This file provides comprehensive context for understanding the `@tldraw/editor` package, the core infinite canvas editor for tldraw.

## Package Overview

The `@tldraw/editor` package is the foundational layer of tldraw - a minimal infinite canvas editor without any specific shapes, tools, or UI. It provides the core editing engine that the main `tldraw` package builds upon.

**Key Distinction:** This package provides the editor engine only. For a complete editor with shapes and UI, use `@tldraw/tldraw` instead.

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

### Manager System

The editor uses specialized managers for different concerns:

**Core Managers:**
- `ClickManager` - Multi-click detection and handling
- `HistoryManager` - Undo/redo functionality  
- `ScribbleManager` - Brush/scribble interactions
- `SnapManager` - Shape snapping during interactions
- `TextManager` - Text measurement and rendering
- `FontManager` - Font loading and management
- `TickManager` - Animation frame management
- `EdgeScrollManager` - Auto-scroll at viewport edges
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
- `src/lib/editor/Editor.ts` - Main editor class (3000+ lines)
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

### Managers
- `src/lib/editor/managers/` - All manager implementations
- Each manager handles a specific editor concern

### Utilities
- `src/lib/utils/` - Editor-specific utilities
- `src/lib/primitives/` - Math and geometry utilities
- `src/lib/hooks/` - React hooks for editor integration

## Development Patterns

### Creating Custom Shapes
1. Extend `ShapeUtil<YourShapeType>`
2. Implement required methods (`getGeometry`, `component`, etc.)
3. Register with editor via `shapeUtils` prop
4. Define shape schema in tlschema package

### Creating Custom Tools
1. Extend `StateNode`
2. Define state hierarchy and event handlers
3. Register with editor via `tools` prop
4. Implement state transitions and interactions

### State Management
- Use `editor.store` for document data
- Use `editor.getSelectionPageBounds()` style methods for derived state
- Subscribe to changes via `editor.store.listen()`
- Use transactions for atomic updates

### Testing
- Tests located alongside source files (`.test.ts`)
- Use `TestEditor.ts` for editor testing utilities
- Mock DOM APIs and canvas rendering
- Test both isolated units and integration scenarios

## Dependencies

**Runtime Dependencies:**
- `@tldraw/state` - Reactive state management
- `@tldraw/store` - Document store
- `@tldraw/tlschema` - Type definitions and migrations
- `@tldraw/utils` - Shared utilities
- `@tiptap/core` - Rich text editing
- `@use-gesture/react` - Touch/gesture handling
- `eventemitter3` - Event system
- `idb` - IndexedDB wrapper

**Key Peer Dependencies:**
- React 18+ required
- No specific DOM requirements beyond standard browser APIs

## Performance Considerations

- Reactive system minimizes unnecessary re-renders
- Geometry calculations cached and memoized
- Large shape counts handled via culling
- Canvas rendering optimized for 60fps interactions
- Font loading managed to prevent layout shifts

## Extensibility Points

**Highly Customizable:**
- Shape definitions via ShapeUtil
- Tool behavior via StateNode
- UI components via components prop
- Event handling via editor instance
- Styling via CSS custom properties

**Less Customizable:**
- Core editor logic and data flow
- Store structure and reactivity system
- Basic event processing pipeline