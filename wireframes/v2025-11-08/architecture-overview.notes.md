# Architecture Overview - Detailed Notes

## High-Level System Design

The tldraw architecture follows a carefully designed layered approach, with each layer building on the previous one. This design enables flexibility, extensibility, and clear separation of concerns.

## Architectural Layers

### Layer 1: Foundation - Core Engine

The foundational layer provides the essential building blocks that everything else depends on.

#### Reactive State System (`@tldraw/state`)

**Purpose:** Fine-grained reactive state management similar to MobX or SolidJS.

**Key Components:**
- **Atom<T>** - Mutable state containers
  - Hold reactive values
  - Notify dependents on changes
  - Support transactions for atomic updates

- **Computed<T>** - Derived reactive values
  - Automatically track dependencies
  - Cache results until dependencies change
  - Recalculate only when needed

- **Reactor** - Side effect management
  - Subscribe to state changes
  - Execute effects when dependencies update
  - Automatic cleanup and disposal

**Design Pattern:** Signal-based reactivity with automatic dependency tracking. When a computed value reads from atoms, it automatically registers those atoms as dependencies. Changes to dependencies trigger recomputation.

**Performance:** Highly optimized with `ArraySet` for dependency tracking, `WeakCache` for object-keyed caches, and pluggable scheduling (immediate vs animation frame throttled).

#### Data Persistence (`@tldraw/store`)

**Purpose:** Reactive record storage system with validation, migrations, and history tracking.

**Key Components:**
- **Record Storage** - Type-safe record collections
  - `AtomMap<RecordId, Record>` for reactive access
  - Individual atoms per record for fine-grained updates
  - Efficient batch operations

- **Change History** - Track all document changes
  - `RecordsDiff` format (added, updated, removed)
  - History accumulator batches changes
  - Support for undo/redo

- **Reactive Queries** - Efficient indexing and querying
  - `RSIndex` for property-based indexes
  - Incremental index updates via diffs
  - Automatic index maintenance

- **Schema Migrations** - Version-based data evolution
  - Forward and backward migrations
  - Dependency-aware ordering
  - Validation during migration

**Design Pattern:** All store operations trigger reactive updates. Components automatically re-render when their dependencies change. Store maintains consistency through validation and transactions.

#### Type System (`@tldraw/tlschema`)

**Purpose:** Centralized type definitions, validators, and schema management.

**Key Components:**
- **Shape Types** - Definitions for all shape types (Text, Geo, Arrow, Draw, Note, Frame, Image, Video, Bookmark, Embed, Highlight, Line)
- **Binding Types** - Relationship types (Arrow bindings, etc.)
- **Validators** - Runtime type checking using `@tldraw/validate`
- **Migrations** - Schema evolution logic

**Design Pattern:** Single source of truth for all data types. Validators ensure runtime type safety. Migrations handle schema changes across versions.

#### Core Editor (`@tldraw/editor`)

**Purpose:** Minimal infinite canvas editor without specific shapes, tools, or UI.

**Key Components:**
- **Editor Class** - Central orchestrator
  - Manages store, camera, selection, tools
  - Provides main API surface
  - Event-driven architecture using EventEmitter3
  - All state is reactive

- **Shape System** - Extensible shape architecture
  - `ShapeUtil` abstract base class
  - Each shape type has a ShapeUtil implementation
  - Handles geometry, rendering, interactions

- **Tool System** - Hierarchical state machines
  - `StateNode` base class for tools
  - Event-driven (pointer, keyboard, tick)
  - Complex tools have child states

- **Binding System** - Shape relationships
  - `BindingUtil` abstract base class
  - Manages connections between shapes
  - Automatic updates when connected shapes change

- **Managers** - Specialized subsystems
  - ClickManager, EdgeScrollManager, FocusManager
  - FontManager, HistoryManager, ScribbleManager
  - SnapManager, TextManager, TickManager
  - UserPreferencesManager

**Design Pattern:** Composition over inheritance. The Editor class composes managers and provides a unified API. Tools and shapes are pluggable through utility classes.

### Layer 2: Complete SDK (`@tldraw/tldraw`)

The complete SDK builds on the editor foundation to provide a batteries-included drawing experience.

#### Shape Implementations

**12+ Default Shape Types:**
- **Text** - Rich text editing with Tiptap integration
- **Draw** - Freehand drawing with stroke optimization
- **Geo** - Geometric shapes (rectangle, ellipse, triangle, diamond, pentagon, hexagon, cloud, star, oval, trapezoid, rhombus, etc.)
- **Arrow** - Smart arrows with binding capabilities
- **Note** - Sticky note shapes with color variants
- **Frame** - Container frames for grouping shapes
- **Image** - Image shapes with cropping support
- **Video** - Video playback shapes
- **Bookmark** - URL bookmark cards with metadata
- **Embed** - Embedded content (YouTube, Figma, Excalidraw, etc.)
- **Highlight** - Highlighter annotations
- **Line** - Straight lines with various styles

**Each shape includes:**
- ShapeUtil class for behavior
- ShapeTool for creation (if applicable)
- Tool states (Idle, Pointing, etc.)
- Geometry calculations
- Rendering components

#### Tool Implementations

**Complete toolset:**
- **SelectTool** - Most complex tool with multiple child states
  - Idle, Brushing, Translating, Resizing, Rotating
  - Crop, EditingShape, various Pointing states

- **Shape Tools** - One creation tool per shape type

- **HandTool** - Pan/move canvas

- **EraserTool** - Delete shapes by brushing

- **LaserTool** - Temporary pointer for presentations

- **ZoomTool** - Zoom to specific areas

#### UI System

**Comprehensive responsive UI:**
- **Toolbar** - Tool selection with overflow handling
- **Style Panel** - Shape properties (color, size, opacity, font, dash, fill, etc.)
- **Menu Panel** - Application menu with actions
- **Share Panel** - Collaboration and sharing
- **Navigation Panel** - Page navigation and zoom controls
- **Minimap** - WebGL-accelerated canvas overview
- **Dialogs** - Modals for embeds, links, keyboard shortcuts
- **Toasts** - User notifications

**Responsive System:**
- Breakpoint-based rendering (mobile, tablet, desktop)
- Touch-optimized interactions
- Adaptive UI based on screen size
- Virtual keyboard handling on mobile

#### Asset & Content Handling

**External Content System:**
- **Files** - Drag/drop and paste of images/videos
- **URLs** - Automatic bookmark creation with metadata extraction
- **Text** - Smart text pasting with rich text support
- **SVG** - Vector graphics import with size calculation
- **Embeds** - YouTube, Figma, Excalidraw, Google Maps, etc.
- **Tldraw Content** - Copy/paste between instances
- **Excalidraw Import** - Import from Excalidraw format

**Asset Management:**
- Size and type validation
- Automatic image resizing and optimization
- Hash-based deduplication
- Temporary preview creation
- Background upload processing

### Layer 3: Collaboration

Real-time multiplayer functionality built on WebSocket protocol.

#### Sync Core (`@tldraw/sync-core`)

**Protocol Implementation:**
- WebSocket-based communication
- Binary message format for efficiency
- Operational transformation for conflict resolution
- Connection state management

**Presence System:**
- Live cursor positions
- Selection indicators
- User awareness
- Separate from document state (synced but not persisted)

**Design Pattern:** Conflict-free updates using operational transformation. Changes are applied optimistically on the client, then reconciled with server state.

#### Sync React Hooks (`@tldraw/sync`)

**High-level React integration:**
- **useSync()** - Production multiplayer hook
  - WebSocket URI configuration
  - Asset store integration
  - User info management
  - Connection status tracking

- **useSyncDemo()** - Demo server integration
  - Quick prototyping
  - Hosted demo infrastructure
  - Asset optimization

**Connection Management:**
- Automatic reconnection with exponential backoff
- Graceful degradation to offline mode
- State buffering during disconnection
- Conflict resolution on reconnect

### Layer 4: Applications

Production applications built using the SDK.

#### tldraw.com Stack

**Frontend (React SPA):**
- Vite build system with SWC
- Clerk authentication
- React Router v6 with lazy-loaded routes
- FormatJS i18n (40+ languages)
- File management (TLA system)
- Zero database sync (Rocicorp)
- Sentry error tracking
- PostHog analytics

**Backend Services:**
- **Sync Worker** - Cloudflare Worker with Durable Objects
  - Room management
  - Real-time sync
  - File CRUD operations
  - Sharing and permissions

- **Asset Upload Worker** - Cloudflare Worker
  - Media upload handling
  - R2 object storage
  - Asset validation

- **Image Resize Worker** - Cloudflare Worker
  - Image optimization
  - Format conversion (AVIF/WebP)
  - Automatic resizing

**Data Persistence:**
- PostgreSQL - Source of truth for user data
- R2 Storage - Media file storage
- IndexedDB - Client-side caching
- Zero Sync - Optimistic client-server sync

#### Other Applications

- **Examples App** - SDK showcase with 130+ examples
- **Docs Site** - Documentation at tldraw.dev (Next.js + SQLite + Algolia)
- **VSCode Extension** - .tldr file support with webview rendering

## Key Architectural Decisions

### 1. Reactive-First Design

**Decision:** Use signal-based reactivity throughout the stack.

**Rationale:**
- Fine-grained updates minimize re-renders
- Automatic dependency tracking reduces boilerplate
- Predictable performance characteristics
- Easier debugging with clear data flow

### 2. Layered SDK Architecture

**Decision:** Separate editor engine from complete SDK.

**Rationale:**
- Flexibility for different use cases
- Clear extension points
- Smaller bundle sizes when UI not needed
- Easier to maintain and test

### 3. Utility-Based Extensibility

**Decision:** Use ShapeUtil and BindingUtil classes instead of class inheritance.

**Rationale:**
- Composition over inheritance
- Easier to test in isolation
- Clear API boundaries
- Type-safe extension points

### 4. State Machines for Tools

**Decision:** Implement tools as hierarchical state machines (StateNode).

**Rationale:**
- Complex interactions become manageable
- Clear state transitions
- Easier to debug tool behavior
- Predictable event handling

### 5. Operational Transformation for Sync

**Decision:** Use OT instead of CRDT for real-time collaboration.

**Rationale:**
- Better for canvas-based applications
- More intuitive conflict resolution
- Smaller message sizes
- Proven technology

### 6. Cloudflare Workers for Backend

**Decision:** Use Cloudflare Workers with Durable Objects for multiplayer.

**Rationale:**
- Global edge deployment
- Automatic scaling
- Built-in WebSocket support
- Low latency worldwide

## Design Patterns Used

### 1. Signals Pattern
All reactive state uses Atom/Computed pattern for efficient updates.

### 2. State Machine Pattern
Tools implemented as hierarchical finite state machines.

### 3. Utility Pattern
Shapes and bindings use utility classes instead of inheritance.

### 4. Manager Pattern
Editor delegates specialized concerns to manager classes.

### 5. Provider Pattern
React context providers for dependency injection.

### 6. Repository Pattern
Store abstracts data persistence from business logic.

### 7. Observer Pattern
EventEmitter3 for event-driven architecture.

### 8. Factory Pattern
RecordType classes create validated records.

## External Dependencies

### Core Runtime Dependencies
- **React** - UI framework (18+)
- **Tiptap** - Rich text editing
- **EventEmitter3** - Event system
- **idb** - IndexedDB wrapper
- **@use-gesture/react** - Touch/gesture handling

### Build & Development Dependencies
- **Vite** - Build tool for applications
- **TypeScript** - Type system
- **LazyRepo** - Incremental build system
- **Vitest** - Test runner
- **Playwright** - E2E testing

### tldraw.com Specific
- **Clerk** - Authentication
- **Rocicorp Zero** - Client-server sync
- **Sentry** - Error tracking
- **PostHog** - Analytics
- **Cloudflare Workers** - Serverless backend

## Performance Characteristics

### Rendering Performance
- Viewport culling - only visible shapes rendered
- Geometry caching with invalidation
- WebGL-accelerated minimap
- Efficient hit testing

### State Management Performance
- Minimal re-renders via signals
- Batched updates prevent cascading changes
- Computed values cached until dependencies change
- Memory-optimized with ArraySet and WeakCache

### Network Performance
- Binary WebSocket protocol
- Diff-based synchronization
- Presence update throttling
- Asset optimization and CDN delivery

### Memory Management
- Automatic cleanup of listeners and reactors
- Asset deduplication
- Store history pruning
- Shape utility garbage collection

## Areas of Technical Complexity

### 1. SelectTool State Machine
Most complex tool with multiple child states and intricate interaction logic.

### 2. Arrow Binding System
Smart arrow routing with obstacle avoidance and automatic reconnection.

### 3. Migration System
Version-based migrations with dependencies, rollback, and validation.

### 4. Sync Protocol
Operational transformation with conflict resolution and presence management.

### 5. Asset Pipeline
Multiple workers, optimization strategies, and format conversion.

### 6. Text Editing Integration
Tiptap integration with tldraw's event system and state management.

## Common Integration Patterns

### Embedding tldraw in Applications
```typescript
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

function MyApp() {
  return <Tldraw />
}
```

### Custom Shapes
Define ShapeUtil, register with editor, optionally create tool.

### Custom Tools
Create StateNode class, define state machine, register with editor.

### Multiplayer Integration
Use `useSync()` hook with WebSocket URI and asset store.

### Custom UI
Override components via `components` prop on Tldraw component.

## Testing Strategy

### Unit Tests
- Test individual components in isolation
- Vitest for fast execution
- Mock dependencies as needed

### Integration Tests
- Test features end-to-end within editor
- Use TestEditor for controlled environment
- Focus on interaction patterns

### E2E Tests
- Playwright for full browser automation
- Test complete user workflows
- Visual regression testing

## Future Architectural Directions

### Planned Improvements
- Zero sync integration completion
- Enhanced mobile experience
- Additional shape types
- Performance optimizations
- Improved accessibility

### Known Technical Debt
- Legacy route compatibility
- Some circular dependencies
- Migration system complexity
- Asset pipeline fragmentation
