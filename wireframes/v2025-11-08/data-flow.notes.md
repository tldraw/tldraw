# Data Flow - Detailed Notes

## Overview

This document describes how data flows through the tldraw system, covering local editing, reactive updates, multiplayer synchronization, and persistence. Understanding these flows is critical for working with tldraw's architecture.

## Core Data Flow Patterns

### 1. Local Editing Flow

**Trigger:** User interaction (mouse, keyboard, touch)

**Path:**
1. DOM captures browser event
2. Event flows to Editor event handlers
3. Editor delegates to current Tool (StateNode)
4. Tool processes event through state machine
5. Tool calls Editor API methods (`createShape`, `updateShape`, etc.)
6. Editor validates and calls Store methods
7. Store updates individual record Atoms
8. Atoms notify dependents (computed values, reactors, React components)
9. React components re-render affected UI
10. User sees immediate feedback

**Key Characteristics:**
- **Synchronous** - Updates happen immediately
- **Optimistic** - No server round-trip for local editing
- **Precise** - Only affected components re-render
- **Validated** - All updates go through validation

**Example - Creating a Rectangle:**
```typescript
// 1. User clicks with Geo tool active
// 2. Tool's onPointerDown handler fires
// 3. Tool creates shape
editor.createShape({
  type: 'geo',
  x: point.x,
  y: point.y,
  props: { geo: 'rectangle', w: 100, h: 100 }
})
// 4. Editor → Store → Atoms → React → User sees rectangle
```

### 2. Reactive Update Flow

**Trigger:** Store record changes

**Path:**
1. Store receives `put([records])` call
2. Store validates records against schema
3. Store updates AtomMap (individual atoms per record)
4. Each atom update triggers dependency notifications
5. Computed values recalculate (if dependencies changed)
6. Reactors execute side effects
7. React components re-render (via useValue hook)
8. History accumulator batches changes
9. RecordsDiff computed (added, updated, removed)
10. History atom updates
11. Listeners notified of changes

**Key Characteristics:**
- **Batched** - Multiple updates can batch together
- **Efficient** - Only changed atoms notify dependents
- **Tracked** - Full history of changes maintained
- **Reactive** - Automatic propagation to all dependents

**Example - Updating Shape Color:**
```typescript
// 1. User changes color in style panel
editor.updateShape(shapeId, { props: { color: 'red' } })

// 2. Store updates shape atom
store.put([{ ...shape, props: { ...shape.props, color: 'red' } }])

// 3. Shape atom notifies:
//    - Shape component (re-renders)
//    - Geometry computed (recalculates if needed)
//    - Selection bounds (updates if selected)
//    - History (records change)
```

### 3. Multiplayer Sync Flow

**Trigger:** User makes change in multiplayer session

**Client-Side Path:**
1. User makes change (same as local editing)
2. Store updates locally (optimistic)
3. React re-renders immediately
4. Store notifies Sync client of change (source: 'user')
5. Sync client creates diff message
6. Diff encoded to binary format
7. Sent via WebSocket to server

**Server-Side Path:**
1. Server receives WebSocket message
2. Message decoded to diff
3. Operational transform resolves conflicts with concurrent changes
4. Diff applied to server's room state
5. Change persisted to database (async)
6. Diff broadcast to all other clients

**Other Clients Path:**
1. Receive diff via WebSocket
2. Decode message
3. Apply to local store (source: 'remote')
4. Store updates atoms
5. React components re-render
6. User sees collaborator's changes

**Key Characteristics:**
- **Optimistic** - Local changes appear immediately
- **Eventually Consistent** - Server reconciles all changes
- **Conflict-Free** - OT ensures consistent final state
- **Efficient** - Only diffs transmitted, not full state

**Example - Collaborative Editing:**
```typescript
// User A moves shape
editor.updateShape(shapeId, { x: 100, y: 100 })
// ↓ Immediate local update
// ↓ Send diff to server
// ↓ Server applies OT
// ↓ Broadcast to User B
// → User B sees shape move
```

### 4. Presence Flow (Cursors and Selections)

**Trigger:** User moves mouse or changes selection

**Path:**
1. User moves mouse
2. Editor captures pointer event
3. Editor computes presence state:
   - Cursor position
   - Current selection
   - Brush area (if brushing)
   - Current tool
4. Presence computed value updates
5. Sync client throttles presence updates (max ~60fps)
6. Presence message sent via WebSocket
7. Server broadcasts to other clients (not persisted)
8. Other clients receive presence
9. Store updates presence records (session scope)
10. React renders cursors and selection indicators

**Key Characteristics:**
- **Throttled** - Presence updates limited to prevent spam
- **Ephemeral** - Not persisted to database
- **Separate Channel** - Doesn't interfere with document sync
- **Immediate** - Low latency for smooth cursors

**Presence Data Structure:**
```typescript
{
  userId: 'user-123',
  userName: 'Alice',
  cursor: { x: 450, y: 320 },
  selectedShapeIds: ['shape-abc'],
  brush: null,
  // Custom fields allowed
}
```

### 5. Asset Upload Flow

**Trigger:** User drops image file or pastes image

**Path:**
1. User drops file on canvas
2. Editor external content handler intercepts
3. Handler validates file (type, size)
4. Temporary asset record created with blob URL
5. Store updated with temporary asset
6. React renders image immediately (optimistic)
7. Asset upload handler called asynchronously
8. File uploaded to asset worker (HTTP POST)
9. Asset worker:
   - Validates file
   - Computes hash (deduplication)
   - Resizes if needed
   - Stores in R2
   - Returns final URL
10. Editor updates asset record with final URL
11. Store updates atom
12. React updates image source

**Key Characteristics:**
- **Optimistic** - Image shows immediately with blob URL
- **Async** - Upload doesn't block editing
- **Progressive** - Can show upload progress
- **Deduplicated** - Same file uploaded once

**Example - Image Drop:**
```typescript
// 1. User drops image.png
// 2. Blob URL: blob:http://localhost/abc-123
editor.createShape({
  type: 'image',
  props: {
    assetId: 'asset-temp',
    w: 400, h: 300
  }
})
// 3. Upload starts in background
// 4. Final URL returned
editor.updateAsset('asset-temp', {
  src: 'https://cdn.tldraw.com/uploads/abc-123.png'
})
```

### 6. Persistence Flow

**Local Persistence (IndexedDB):**
1. Store changes accumulate
2. Debounced save trigger (e.g., 2 seconds idle)
3. Store serializes to snapshot
4. Snapshot saved to IndexedDB
5. On next load, snapshot restored from IndexedDB

**Server Persistence (PostgreSQL):**
1. Sync client sends changes to server
2. Server applies changes to room state
3. Room state persisted to PostgreSQL (async)
4. Database serves as source of truth
5. On reconnect, server sends current state

**Key Characteristics:**
- **Debounced** - Saves batched for performance
- **Dual-Layer** - Both local (IndexedDB) and server (PostgreSQL)
- **Resumable** - Can resume from either local or server
- **Migration** - Schema migrations handled on load

### 7. Shape Rendering Flow

**Trigger:** Shape record changes

**Path:**
1. Store updates shape atom
2. Atom notifies React component (via useValue hook)
3. Component re-renders
4. Component requests ShapeUtil for shape type
5. Editor returns appropriate ShapeUtil instance
6. ShapeUtil.component(shape) called
7. Component returns React element
8. React renders element to canvas
9. Shape appears/updates on screen

**Optimization:**
- **Viewport Culling** - Only visible shapes render
- **Geometry Caching** - Bounds cached until shape changes
- **React.memo** - Component memoization prevents unnecessary renders
- **Signal Precision** - Only exact dependencies trigger re-render

**Example - Shape Update:**
```typescript
// Shape atom changes
const shape = store.get(shapeId)

// React component observes
const MyShapeComponent = track(() => {
  const shape = useValue('shape', () => editor.getShape(shapeId))
  const ShapeUtil = editor.getShapeUtil(shape)
  return ShapeUtil.component(shape)
})
```

### 8. Tool Interaction Flow

**Trigger:** User interacts with tool

**Example - Drawing a Rectangle:**

**Phase 1: Pointer Down**
1. User presses mouse button
2. Tool receives `onPointerDown` event
3. Tool state machine transitions (Idle → Pointing)
4. Tool creates temporary shape in store
5. Shape renders immediately

**Phase 2: Pointer Move**
1. User drags mouse
2. Tool receives `onPointerMove` events
3. Tool updates temporary shape dimensions
4. Store updates shape atom
5. React re-renders shape with new size
6. User sees shape growing in real-time

**Phase 3: Pointer Up**
1. User releases mouse button
2. Tool receives `onPointerUp` event
3. Tool finalizes shape
4. State machine transitions (Pointing → Idle)
5. Final shape committed to store
6. History mark created (for undo)

**Key Characteristics:**
- **State Machine** - Clear state transitions
- **Temporary State** - Preview before commit
- **Continuous Updates** - Real-time feedback
- **Cancelable** - Can cancel (ESC) before commit

### 9. Undo/Redo Flow

**Trigger:** User presses Ctrl+Z (undo) or Ctrl+Shift+Z (redo)

**Undo Path:**
1. User presses Ctrl+Z
2. Editor.undo() called
3. HistoryManager.undo() retrieves last diff
4. Diff reversed:
   - `added` → remove records
   - `updated` → restore 'from' values
   - `removed` → restore records
5. Reversed changes applied to store
6. Atoms update
7. React re-renders previous state
8. User sees state restored

**Redo Path:**
1. User presses Ctrl+Shift+Z
2. Editor.redo() called
3. HistoryManager.redo() retrieves next diff
4. Diff re-applied forward
5. Atoms update
6. React re-renders future state

**Mark/Bail System:**
```typescript
// Create a mark (checkpoint)
editor.mark('before-complex-operation')

// Do complex operation
editor.createShape(...)
editor.updateShape(...)

// Undo entire operation
editor.bailToMark('before-complex-operation')
```

**Key Characteristics:**
- **Diff-Based** - Only differences stored
- **Efficient** - Minimal memory for history
- **Granular** - Can undo/redo individual operations
- **Marks** - Checkpoints for multi-step operations

### 10. Computed Geometry Flow

**Trigger:** Shape changes

**Path:**
1. Shape atom updates
2. Geometry computed value checks dependencies
3. If shape changed, recalculate:
   - ShapeUtil.getGeometry(shape) called
   - Returns Geometry2d object (Rectangle2d, Polygon2d, etc.)
   - Geometry cached in computed value
4. Geometry used for:
   - Hit testing (is point inside shape?)
   - Bounds calculation (bounding box)
   - Snapping (snap to edges, centers)
   - Selection indicators
   - Collision detection

**Key Characteristics:**
- **Cached** - Computed only when shape changes
- **Memoized** - Same shape = same geometry object
- **Efficient** - Avoids redundant calculations
- **Precise** - Exact geometry for complex shapes

**Example:**
```typescript
// Arrow shape geometry
const geometry = computed('arrow-geometry', () => {
  const shape = store.get(shapeId)
  const util = editor.getShapeUtil(shape)
  return util.getGeometry(shape)
  // Returns Geometry2d with precise path
})

// Used for hit testing
const hit = geometry.get().hitTestPoint(point)
```

## State Transformations

### Record Creation
```
User Input → Tool → Editor.createShape() → Store.put()
→ Atom created → Computed values update → React renders
```

### Record Update
```
User Input → Tool → Editor.updateShape() → Store.put()
→ Atom updated → Dependents notified → React re-renders
```

### Record Deletion
```
User Input → Tool → Editor.deleteShapes() → Store.remove()
→ Atoms deleted → Cleanup → React removes
```

## Event Flow Paths

### Pointer Events
```
Browser → DOM → Editor → Tool.onPointerDown/Move/Up
→ State Machine → Editor API → Store → React
```

### Keyboard Events
```
Browser → DOM → Editor → Tool.onKeyDown/Up
→ State Machine or Direct Action → Store → React
```

### Tick Events (Animation Frame)
```
requestAnimationFrame → TickManager → Tool.onTick
→ Smooth animations → Store (if state changes) → React
```

## Data Transformation Points

### 1. Validation (Store Entry)
- Schema validation
- Type checking
- Constraint enforcement
- Default value application

### 2. Side Effects (Store Operations)
- Before/after create hooks
- Before/after update hooks
- Before/after delete hooks
- Reactive business logic

### 3. Operational Transform (Sync)
- Concurrent change resolution
- Conflict-free merge
- Causal ordering
- Convergence guarantee

### 4. Serialization (Persistence)
- Store → Snapshot JSON
- Binary encoding for WebSocket
- IndexedDB storage
- PostgreSQL JSON columns

## Performance Optimizations

### 1. Batching
- Store changes batched within transactions
- React updates batched by React
- History diffs squashed
- WebSocket messages coalesced

### 2. Throttling
- Presence updates throttled (~60fps)
- Geometry recalculation memoized
- Viewport updates throttled
- Scroll events throttled

### 3. Debouncing
- IndexedDB saves debounced (2s)
- Search debounced
- Auto-save debounced

### 4. Caching
- Geometry cached in computed values
- Shape bounds cached
- Font metrics cached
- Asset URLs cached

### 5. Lazy Loading
- Routes loaded on demand
- Components loaded lazily
- Assets loaded when visible
- Fonts loaded asynchronously

## Common Data Flow Patterns

### Pattern 1: User Action → Immediate Feedback
```
User clicks → Tool acts → Store updates → React renders
(All synchronous, instant feedback)
```

### Pattern 2: User Action → Async Processing
```
User drops file → Temporary state → Upload → Update final state
(Optimistic UI, async completion)
```

### Pattern 3: Remote Change → Local Update
```
WebSocket message → Sync applies → Store updates → React renders
(Server-driven updates)
```

### Pattern 4: Reactive Side Effect
```
Shape created → Side effect → Create related shape → Store updates
(Automatic dependent actions)
```

## Error Handling in Data Flow

### Validation Errors
- Caught at Store.put()
- Logged to console (development)
- Reported to Sentry (production)
- User notified via toast

### Sync Errors
- Connection loss → Offline mode
- Conflict → OT resolution
- Schema mismatch → Migration or error
- Rate limit → Backoff retry

### Render Errors
- Error boundaries catch
- Fallback UI displayed
- Error reported to Sentry
- User can reload

## Debugging Data Flow

### Tools and Techniques

**1. Console Logging:**
```typescript
editor.store.listen((entry) => {
  console.log('Store changed:', entry)
})
```

**2. React DevTools:**
- Inspect component re-renders
- View props and state
- Profile performance

**3. Editor Instance:**
```typescript
window.editor = editor // Access in console
editor.store.allRecords() // Inspect all records
editor.getCurrentTool() // Check current tool
```

**4. History Inspector:**
```typescript
editor.history.getNumUndos() // Undo stack size
editor.history.getNumRedos() // Redo stack size
```

**5. Sync Debugging:**
```typescript
// Enable verbose logging in sync client
// See all WebSocket messages
```

## Data Flow Anti-Patterns

### ❌ Avoid: Direct DOM Manipulation
```typescript
// Bad - bypasses React
document.querySelector('.shape').style.color = 'red'

// Good - update store
editor.updateShape(id, { props: { color: 'red' } })
```

### ❌ Avoid: Mutating Records
```typescript
// Bad - mutates record
const shape = editor.getShape(id)
shape.x = 100 // ❌ Doesn't trigger updates

// Good - use Editor API
editor.updateShape(id, { x: 100 })
```

### ❌ Avoid: Synchronous Loops
```typescript
// Bad - synchronous updates in loop
shapes.forEach(shape => {
  editor.updateShape(shape.id, { ... })
})

// Good - batch update
editor.batch(() => {
  shapes.forEach(shape => {
    editor.updateShape(shape.id, { ... })
  })
})
```

### ❌ Avoid: Untracked Side Effects
```typescript
// Bad - side effect not tracked
useEffect(() => {
  const shape = editor.getShape(id)
  // Missing dependencies
}, [])

// Good - use reactive tracking
const shape = useValue('shape', () => editor.getShape(id))
```

## Data Flow Best Practices

### ✅ Use Editor API
Always use `editor` methods, not direct store access.

### ✅ Batch Related Changes
```typescript
editor.batch(() => {
  editor.createShape(...)
  editor.updateShape(...)
  editor.deleteShapes(...)
})
```

### ✅ Use Transactions
Group related operations that should undo together.

### ✅ Track Dependencies
Use `computed` and `track` for reactive code.

### ✅ Handle Async Properly
Use optimistic updates for better UX.

### ✅ Validate Early
Validate user input before updating store.

### ✅ Clean Up Resources
Dispose reactors, remove listeners on unmount.
