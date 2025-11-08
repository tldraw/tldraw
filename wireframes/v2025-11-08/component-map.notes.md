# Component Map - Detailed Notes

## Module Boundaries and Responsibilities

This document provides a comprehensive breakdown of all major components in the tldraw ecosystem, their responsibilities, public APIs, and dependencies.

## Core Foundation Components

### @tldraw/state - Reactive State Management

**Purpose:** Fine-grained reactive state management system.

**Module Boundary:** Pure reactive primitives with no dependencies on other tldraw packages.

**Public API:**
- `Atom<T>` - Create mutable reactive state
- `Computed<T>` - Create derived reactive values
- `reactor()` - Create side effects that respond to state changes
- `track()` - Track dependencies during computation
- `transaction()` - Batch multiple state updates atomically
- `Reactor` - Side effect management class
- `EffectScheduler` - Pluggable effect scheduling

**Responsibilities:**
- Provide reactive primitives (Atom, Computed)
- Automatic dependency tracking during computation
- Efficient update propagation with minimal recomputation
- Memory management with WeakCache and ArraySet
- Transaction support for atomic updates
- Pluggable scheduling (immediate vs throttled)

**Dependencies:** None (pure library)

**Used By:** @tldraw/store, @tldraw/editor, @tldraw/sync-core

**Key Design Decisions:**
- Signal-based reactivity for fine-grained updates
- Automatic dependency tracking eliminates manual subscriptions
- Lazy computation - computed values only recalculate when read
- Memory-optimized with hybrid ArraySet data structure

### @tldraw/store - Reactive Database

**Purpose:** Type-safe reactive record storage with history, queries, and migrations.

**Module Boundary:** Generic record storage system, not specific to tldraw shapes.

**Public API:**
- `Store<R>` - Main store class
- `RecordType<R>` - Factory for creating typed records
- `StoreSchema` - Schema definition and validation
- `createRecordType()` - Helper for defining record types
- `migrate()` - Migration utilities
- `AtomMap<K, V>` - Reactive map implementation

**Core Methods:**
- `put(records)` - Create or update records
- `remove(ids)` - Delete records
- `get(id)` - Retrieve single record
- `has(id)` - Check record existence
- `allRecords()` - Get all records
- `listen(callback)` - Subscribe to changes
- `query.records(type)` - Get records by type
- `query.index(type, property)` - Get reactive index

**Responsibilities:**
- Record storage with reactive access via AtomMap
- Change history tracking with RecordsDiff
- Validation through StoreSchema
- Query system with reactive indexes
- Side effects for lifecycle hooks
- Migration system for schema evolution
- Transaction support for atomic operations

**Dependencies:**
- @tldraw/state (reactive primitives)
- @tldraw/utils (utilities)
- @tldraw/validate (validation)

**Used By:** @tldraw/editor, @tldraw/sync-core

**Key Design Decisions:**
- AtomMap stores each record in separate atom for fine-grained reactivity
- RecordsDiff format enables efficient change tracking
- RSIndex provides reactive property-based indexes
- Side effects run within transaction context
- Record scopes (document, session, presence) for different persistence strategies

### @tldraw/tlschema - Type Definitions

**Purpose:** Centralized type definitions, validators, and migrations for all tldraw data types.

**Module Boundary:** Type definitions only, no runtime logic beyond validation.

**Public API:**
- Shape type definitions (TLTextShape, TLGeoShape, TLArrowShape, etc.)
- Binding type definitions (TLArrowBinding, etc.)
- Record type definitions (TLPage, TLAsset, TLCamera, etc.)
- `createTLSchema()` - Schema factory
- Validators for all types
- Migration sequences

**Responsibilities:**
- Define all shape types and their properties
- Define binding types
- Define other record types (pages, assets, cameras, etc.)
- Provide runtime validators for type checking
- Maintain migration sequences for schema evolution
- Serve as single source of truth for data structures

**Dependencies:**
- @tldraw/validate (validators)
- @tldraw/utils (utilities)

**Used By:** @tldraw/store, @tldraw/editor, @tldraw/tldraw

**Key Design Decisions:**
- Centralized type definitions prevent duplication
- Runtime validators ensure type safety
- Migrations enable backward compatibility
- Separation of types from implementation

### @tldraw/utils - Shared Utilities

**Purpose:** Shared utility functions and types used across all packages.

**Module Boundary:** Pure functions with no package-specific logic.

**Public API:**
- **Math:** `Vec` (vectors), `Mat` (matrices), `Box` (bounding boxes)
- **Arrays:** `compact()`, `dedupe()`, `sortById()`, `last()`, `partition()`
- **Objects:** `objectMapValues()`, `objectMapKeys()`, `pick()`, `omit()`
- **Performance:** `throttle()`, `debounce()`, `rafThrottle()`, `memoize()`
- **Types:** `RecursivePartial<T>`, `Required<T>`, type guards
- **IDs:** `uniqueId()`, `sortByIndex()`

**Responsibilities:**
- Provide math utilities for canvas operations
- Array and object manipulation helpers
- Performance optimization utilities
- Type utilities and guards
- ID generation and sorting

**Dependencies:** None (pure library)

**Used By:** All packages

**Key Design Decisions:**
- Pure functions for testability
- No external dependencies for maximum reusability
- Performance-optimized implementations
- TypeScript-first with strong typing

### @tldraw/validate - Validation Library

**Purpose:** Lightweight runtime validation library.

**Module Boundary:** Generic validation, not specific to tldraw.

**Public API:**
- `T.object()` - Object schema
- `T.array()` - Array schema
- `T.string()` - String validation
- `T.number()` - Number validation
- `T.boolean()` - Boolean validation
- `T.union()` - Union types
- `T.literal()` - Literal values
- `T.optional()` - Optional fields
- Custom validators

**Responsibilities:**
- Runtime type validation
- Schema definition
- Type narrowing
- Error reporting with helpful messages
- Composable validators

**Dependencies:** None (pure library)

**Used By:** @tldraw/store, @tldraw/tlschema

**Key Design Decisions:**
- Lightweight alternative to Zod/Yup
- TypeScript inference for type safety
- Composable validator functions
- Minimal runtime overhead

## Core Editor Components

### @tldraw/editor - Canvas Engine

**Purpose:** Foundational infinite canvas editor without shapes, tools, or UI.

**Module Boundary:** Core editing functionality, extensible via ShapeUtil/BindingUtil/StateNode.

**Public API:**

**React Component:**
- `<TldrawEditor>` - Main editor component

**Core Classes:**
- `Editor` - Central editor class
- `ShapeUtil<S>` - Abstract base for shape behavior
- `BindingUtil<B>` - Abstract base for binding behavior
- `StateNode` - Abstract base for tool state machines

**Editor Methods (Selection):**
- `editor.getSelectedShapes()`
- `editor.select(ids)`
- `editor.selectAll()`
- `editor.selectNone()`

**Editor Methods (Shapes):**
- `editor.createShape(shape)`
- `editor.updateShape(id, partial)`
- `editor.deleteShapes(ids)`
- `editor.getShape(id)`
- `editor.getShapePageBounds(id)`

**Editor Methods (Camera):**
- `editor.setCamera(point, opts)`
- `editor.zoomIn()`, `editor.zoomOut()`
- `editor.zoomToFit()`, `editor.zoomToSelection()`
- `editor.getViewportPageBounds()`

**Editor Methods (History):**
- `editor.undo()`
- `editor.redo()`
- `editor.mark(id)`
- `editor.bail()`, `editor.bailToMark(id)`

**Editor Methods (Tools):**
- `editor.setCurrentTool(id)`
- `editor.getCurrentTool()`

**Responsibilities:**
- Canvas rendering and viewport management
- Shape system (ShapeUtil framework)
- Tool system (StateNode state machines)
- Binding system (BindingUtil framework)
- Event handling (pointer, keyboard, wheel)
- Selection and interaction
- History (undo/redo)
- Camera control
- Manager composition
- Extensibility framework

**Editor Subsystems:**

#### Managers
- **ClickManager** - Multi-click detection (double, triple clicks)
- **EdgeScrollManager** - Auto-scroll when dragging near edges
- **FocusManager** - Focus state and keyboard events
- **FontManager** - Font loading and management
- **HistoryManager** - Undo/redo with mark/bail system
- **ScribbleManager** - Brush/scribble interactions
- **SnapManager** - Shape snapping and guides
- **TextManager** - Text measurement and rendering
- **TickManager** - Animation frame management
- **UserPreferencesManager** - User settings persistence

#### Shape System
- **ShapeUtil<S>** - Abstract base class
  - `getGeometry(shape)` - Calculate shape bounds and hit area
  - `component(shape)` - React component for rendering
  - `indicator(shape)` - Selection indicator rendering
  - `onResize(shape, info)` - Handle resize interactions
  - `onRotate(shape, info)` - Handle rotation
  - `canBind()`, `canEdit()`, etc. - Capability checks

#### Tool System
- **StateNode** - Abstract base for tools
  - `onEnter(info)` - State entry
  - `onExit(info)` - State exit
  - `onPointerDown/Move/Up(info)` - Pointer events
  - `onKeyDown/Up(info)` - Keyboard events
  - `onTick(elapsed)` - Animation frames
  - `children` - Child states for hierarchical machines

#### Binding System
- **BindingUtil<B>** - Abstract base for bindings
  - `getDefaultProps()` - Default binding properties
  - `onAfterCreate()`, `onAfterChange()` - Lifecycle hooks
  - `onBeforeDelete()` - Cleanup before deletion

**Dependencies:**
- @tldraw/state (reactivity)
- @tldraw/store (document storage)
- @tldraw/tlschema (type definitions)
- @tldraw/utils (utilities)
- @tldraw/validate (validation)
- @tiptap/core, @tiptap/react (text editing)
- @use-gesture/react (touch gestures)

**Used By:** @tldraw/tldraw, applications

**Key Design Decisions:**
- Utility-based extensibility (ShapeUtil, BindingUtil) over class inheritance
- State machines for tools enable complex interactions
- Manager pattern delegates specialized concerns
- Reactive state throughout for automatic updates
- Separation of concerns - editor engine vs UI vs shapes/tools

### @tldraw/tldraw - Complete SDK

**Purpose:** Batteries-included SDK with UI, shapes, and tools.

**Module Boundary:** Wraps @tldraw/editor with complete default implementations.

**Public API:**

**React Component:**
- `<Tldraw>` - Complete tldraw component with UI

**Props:**
- `shapeUtils` - Custom shape utilities (merged with defaults)
- `tools` - Custom tools (merged with defaults)
- `bindingUtils` - Custom binding utilities (merged with defaults)
- `components` - UI component overrides
- `store` - External store or persistence key
- `onMount` - Callback when editor mounts

**Default Exports:**
- `defaultShapeUtils` - 12+ shape implementations
- `defaultTools` - Complete tool set
- `defaultBindingUtils` - Arrow bindings, etc.
- `defaultSideEffects` - Reactive side effects
- `defaultExternalContentHandlers` - Asset processing

**Responsibilities:**
- Provide complete drawing application
- Default shape implementations (Text, Draw, Geo, Arrow, etc.)
- Default tool implementations (Select, Hand, Eraser, etc.)
- Complete UI system (Toolbar, StylePanel, Menu, etc.)
- External content handling (files, URLs, text, SVG)
- Asset management (upload, optimization, deduplication)
- Responsive design (mobile, tablet, desktop)

**Tldraw Subsystems:**

#### Shape Implementations (12+)
Each shape has its own directory with:
- ShapeUtil class
- ShapeTool (if applicable)
- Tool states (Idle, Pointing, etc.)
- Helper components

**Shapes:**
- **Text** - Rich text with Tiptap
- **Draw** - Freehand drawing with stroke optimization
- **Geo** - Geometric shapes (rectangle, ellipse, triangle, etc.)
- **Arrow** - Smart arrows with bindings
- **Note** - Sticky notes
- **Frame** - Container frames
- **Line** - Straight lines
- **Highlight** - Highlighter annotations
- **Image** - Images with cropping
- **Video** - Video playback
- **Bookmark** - URL cards with metadata
- **Embed** - External content (YouTube, Figma, etc.)

#### Tool Implementations
- **SelectTool** - Most complex with child states:
  - Idle, Brushing, Translating, Resizing, Rotating
  - Crop, EditingShape, various Pointing states
- **HandTool** - Pan/move canvas
- **EraserTool** - Delete shapes by brushing
- **LaserTool** - Temporary pointer for presentations
- **ZoomTool** - Zoom to areas
- **Shape Tools** - One per shape type (TextTool, DrawTool, GeoTool, etc.)

#### UI System
- **TldrawUi** - Main UI wrapper
- **TldrawUiContextProvider** - Context setup
- **Toolbar** - Tool selection with overflow
- **StylePanel** - Shape properties (color, size, font, etc.)
- **MenuPanel** - Application menu
- **SharePanel** - Sharing and collaboration
- **NavigationPanel** - Page navigation and zoom
- **Minimap** - WebGL-accelerated overview
- **Dialogs** - Modals (embeds, links, keyboard shortcuts)
- **Toasts** - Notifications
- **Breakpoints** - Responsive system (mobile, tablet, desktop)

**Dependencies:**
- @tldraw/editor (core engine)
- @tldraw/assets (icons, fonts, translations)
- @tldraw/utils, @tldraw/validate, @tldraw/state, etc.

**Used By:** Applications (examples, dotcom, VSCode)

**Key Design Decisions:**
- Wrap editor with complete defaults
- Component override system for customization
- Responsive design with breakpoints
- Asset handling integrated with shape system
- External content handlers for drag/drop, paste

## Collaboration Components

### @tldraw/sync-core - Sync Protocol

**Purpose:** Core synchronization protocol implementation.

**Module Boundary:** Protocol logic, no React dependencies.

**Public API:**
- `TLSyncClient` - Client-side sync
- `TLSyncRoom` - Server-side room management
- `WebSocketAdapter` - WebSocket abstraction
- Presence types and utilities

**Responsibilities:**
- WebSocket protocol implementation
- Binary message encoding/decoding
- Operational transformation for conflict resolution
- Presence system (cursors, selections)
- Connection state management
- Document synchronization

**Dependencies:**
- @tldraw/store (document storage)
- @tldraw/tlschema (types)
- @tldraw/utils

**Used By:** @tldraw/sync, dotcom workers

**Key Design Decisions:**
- Binary protocol for efficiency
- Operational transformation for conflicts
- Presence separate from document state
- Protocol agnostic to transport

### @tldraw/sync - React Integration

**Purpose:** React hooks for multiplayer integration.

**Module Boundary:** React-specific, wraps sync-core.

**Public API:**
- `useSync(options)` - Production multiplayer hook
- `useSyncDemo(options)` - Demo server hook
- `RemoteTLStoreWithStatus` - Store wrapper with status
- `ClientWebSocketAdapter` - WebSocket client

**Hook Options:**
- `uri` - WebSocket server URI (string or async function)
- `userInfo` - User identity and display info
- `assets` - Asset store implementation
- `roomId` - Room identifier
- `trackAnalyticsEvent` - Analytics callback

**Return Value (RemoteTLStoreWithStatus):**
- `{ status: 'loading' }` - Initial connection
- `{ status: 'error', error }` - Connection failed
- `{ status: 'synced-remote', store, connectionStatus }` - Connected

**Responsibilities:**
- React hook integration
- Connection lifecycle management
- Error handling and recovery
- Automatic reconnection
- Presence management
- Asset store integration
- Demo server integration

**Dependencies:**
- @tldraw/sync-core (protocol)
- @tldraw/state-react (React integration)
- tldraw (store and types)
- React

**Used By:** Applications with multiplayer

**Key Design Decisions:**
- Hook-based API for React
- Status-based loading states
- Automatic reconnection with backoff
- Demo server for quick prototyping
- Asset store abstraction

## Application Components

### dotcom/client - Frontend Application

**Purpose:** tldraw.com React SPA.

**Module Boundary:** Application-specific, not reusable.

**Key Modules:**

**Entry Points:**
- `src/main.tsx` - Application entry
- `src/routes.tsx` - Route definitions

**Core Systems:**
- **TLA (tldraw app)** - File management system
  - `src/tla/app/` - Core TLA logic
  - `src/tla/hooks/` - Business logic hooks
  - `src/tla/providers/` - Context providers
  - `src/tla/pages/` - Route pages

**Integration:**
- **Clerk** - Authentication (`ClerkProvider`, `useAuth()`)
- **Zero Sync** - Client database (`useZero()`)
- **React Router** - Navigation (`createBrowserRouter()`)
- **FormatJS** - i18n (`IntlProvider`, `useIntl()`)

**Responsibilities:**
- User interface for tldraw.com
- File management (create, edit, delete, share)
- User authentication and accounts
- Real-time collaboration
- Asset upload and management
- Responsive design
- Error tracking and analytics

**Dependencies:**
- @tldraw/tldraw (editor)
- @tldraw/sync (multiplayer)
- @clerk/clerk-react (auth)
- @rocicorp/zero (sync)
- react-router-dom (routing)
- react-intl (i18n)

**Key Design Decisions:**
- SPA with client-side routing
- Vite for fast development
- Lazy-loaded routes for performance
- Zero sync for optimistic updates
- Clerk for authentication

### dotcom/workers - Backend Services

**Purpose:** Cloudflare Workers for backend services.

**Module Boundary:** Serverless functions, isolated from client.

**Key Workers:**

**sync-worker:**
- Multiplayer backend using Durable Objects
- Room management and persistence
- File CRUD operations
- Sharing and permissions
- Real-time synchronization

**asset-upload-worker:**
- Media upload handling
- R2 object storage integration
- Asset validation and limits
- Deduplication by hash

**image-resize-worker:**
- Image optimization
- Format conversion (AVIF, WebP)
- Automatic resizing
- CDN integration

**Responsibilities:**
- Real-time collaboration backend
- File persistence
- Asset processing and storage
- API endpoints for client

**Dependencies:**
- @tldraw/sync-core (multiplayer)
- @tldraw/dotcom-shared (utilities)
- Cloudflare Workers APIs
- Durable Objects
- R2 Storage

**Key Design Decisions:**
- Cloudflare Workers for global edge deployment
- Durable Objects for stateful rooms
- R2 for durable asset storage
- Separation of concerns (sync, upload, resize)

## Supporting Components

### @tldraw/assets - Asset Management

**Purpose:** Centralized management of icons, fonts, and translations.

**Module Boundary:** Static assets only, bundled into packages.

**Public API:**
- `getAssetUrls()` - Get asset URLs for all assets
- Icon sprite sheets
- Font files
- Translation JSON files

**Contents:**
- **Icons** - 80+ SVG icons in optimized sprite format
- **Fonts** - IBM Plex (Sans, Serif, Mono) + Shantell Sans
- **Translations** - 40+ languages with RTL support

**Responsibilities:**
- Provide static assets
- Icon system
- Font loading
- Internationalization

**Dependencies:** None

**Used By:** @tldraw/tldraw, applications

**Key Design Decisions:**
- SVG sprite sheets for icons
- Multiple export strategies (imports, URLs, self-hosted)
- Centralized translation files
- Optimized asset sizes

## Public APIs Summary

### For SDK Users

**Minimal Setup:**
```typescript
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

<Tldraw />
```

**Custom Shapes:**
```typescript
class MyShapeUtil extends ShapeUtil<MyShape> {
  getGeometry(shape) { /* ... */ }
  component(shape) { /* ... */ }
  indicator(shape) { /* ... */ }
}

<Tldraw shapeUtils={[MyShapeUtil]} />
```

**Custom Tools:**
```typescript
class MyTool extends StateNode {
  onPointerDown(info) { /* ... */ }
}

<Tldraw tools={[MyTool]} />
```

**Multiplayer:**
```typescript
const store = useSync({
  uri: 'wss://myserver.com/room',
  assets: myAssetStore,
})

<Tldraw store={store} />
```

### For Framework Integrators

**Editor-Only:**
```typescript
import { TldrawEditor } from '@tldraw/editor'
import '@tldraw/editor/editor.css'

<TldrawEditor
  shapeUtils={myShapeUtils}
  tools={myTools}
/>
```

**Custom Store:**
```typescript
import { createTLStore } from '@tldraw/editor'

const store = createTLStore({
  shapeUtils: myShapeUtils,
  bindingUtils: myBindingUtils,
})

<TldrawEditor store={store} />
```

## Shared Utilities

### Common Patterns

**Vec (Vector Math):**
```typescript
Vec.Add(a, b)      // Add vectors
Vec.Sub(a, b)      // Subtract
Vec.Mul(a, scalar) // Multiply by scalar
Vec.Len(v)         // Length
Vec.Normalize(v)   // Unit vector
```

**Box (Bounding Boxes):**
```typescript
Box.Includes(box, point) // Point in box
Box.Expand(box, delta)   // Expand box
Box.Common([boxes])      // Intersection
```

**Reactive State:**
```typescript
const count = atom('count', 0)
const doubled = computed('doubled', () => count.get() * 2)

reactor('effect', () => {
  console.log(doubled.get())
})
```

## Where to Make Changes

### Adding a New Shape
1. Define type in `@tldraw/tlschema`
2. Create ShapeUtil in `@tldraw/tldraw/src/lib/shapes/`
3. Create ShapeTool if needed
4. Register in `defaultShapeUtils.ts`
5. Add tests and example

### Adding a New Tool
1. Create StateNode in `@tldraw/tldraw/src/lib/tools/`
2. Define state machine
3. Register in `defaultTools.ts`
4. Add tests and example

### Modifying the UI
1. Find component in `@tldraw/tldraw/src/lib/ui/components/`
2. Override via `components` prop or modify directly
3. Update breakpoints if responsive changes needed

### Adding a Manager
1. Create in `@tldraw/editor/src/lib/editor/managers/`
2. Initialize in `Editor.ts` constructor
3. Add to `Editor` class as property
4. Document public API

### Sync Protocol Changes
1. Modify `@tldraw/sync-core` protocol
2. Update both client and server
3. Consider backward compatibility
4. Update version numbers

## Common Integration Points

### Custom Asset Storage
Implement `TLAssetStore` interface:
```typescript
{
  upload(asset, file): Promise<string>
  resolve(asset, context): string
}
```

### Custom External Content
Register handler:
```typescript
editor.registerExternalAssetHandler('url', async (info) => {
  // Process URL
  return { type: 'bookmark', ... }
})
```

### Custom UI Components
Override via props:
```typescript
<Tldraw components={{
  Toolbar: MyCustomToolbar,
  StylePanel: MyCustomStylePanel,
}} />
```

### Custom Presence
Provide `getUserPresence` function:
```typescript
useSync({
  getUserPresence: (store, user) => ({
    userId: user.id,
    // custom presence data
  })
})
```
