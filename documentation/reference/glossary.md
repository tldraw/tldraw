---
title: Glossary
created_at: 12/17/2024
updated_at: 12/17/2024
keywords:
  - glossary
  - terms
  - definitions
  - reference
---

Key terms and concepts used throughout tldraw documentation and codebase.

## Core concepts

### Editor

The main orchestration class (`Editor`) that coordinates all tldraw functionality including shapes, tools, state, and user interactions.

### Store

A reactive client-side database (`TLStore`) that holds all document data including shapes, pages, and user state. Based on the @tldraw/store package.

### Shape

A visual element on the canvas. Shapes have properties like position, size, and type-specific props. Defined by `TLShape` type.

### ShapeUtil

A class that defines how a shape type behaves, renders, and responds to interactions. Each shape type has a corresponding ShapeUtil.

### Binding

A relationship between two shapes that causes them to update together. For example, arrows bind to shapes they connect to.

### BindingUtil

A class that defines how a binding type works, including lifecycle callbacks for when bound shapes change.

### Tool

An interaction mode that handles user input. Tools are state machines built on `StateNode`.

### StateNode

The base class for tool state machines. Handles events and transitions between states.

## State management

### Atom

A reactive container for a single value. When the value changes, dependent computations update automatically.

### Computed

A derived value that automatically updates when its dependencies change. Created with `computed()`.

### Signal

General term for reactive primitives (atoms and computed values) from @tldraw/state.

### Transaction

A batch of changes that are applied atomically. Other code won't see intermediate states during a transaction.

## Document structure

### Page

A container for shapes within a document. Documents can have multiple pages.

### Instance state

Ephemeral state specific to the current editor instance, like viewport position and selected tool.

### Document state

Persistent state that represents the document content, like shapes and pages.

### User state

State related to the current user, like their cursor position and preferences.

## Geometry

### Bounds

A rectangle defined by position and dimensions: `{ x, y, w, h }`.

### Box

A 2D axis-aligned bounding box class with methods for intersection, containment, etc.

### Vec

A 2D vector class with x/y coordinates and methods for vector math.

### Matrix2d

A 2D transformation matrix for rotations, translations, and scaling.

## Multiplayer

### Room

A collaborative session where multiple users can edit together.

### Presence

Information about other users in a room, like cursor position and name.

### Sync

The process of keeping multiple clients' document state consistent.

### TLSocketRoom

Server-side room management class from @tldraw/sync-core.

## Records

### Record

A single data entry in the store, like a shape or page.

### RecordId

A typed unique identifier for a record, e.g., `shape:abc123`.

### RecordsDiff

A description of changes to records: added, updated, and removed.

## UI

### Component override

A custom React component that replaces a default tldraw UI component.

### Canvas

The main drawing area where shapes are rendered and users interact.

### Toolbar

The main UI element for selecting tools.

### StylePanel

UI for editing the style properties of selected shapes.

## Build system

### LazyRepo

The build orchestration system that handles incremental, cached builds.

### Workspace

A package within the Yarn monorepo.

### Project reference

A TypeScript feature linking packages for incremental compilation.

## Events

### PointerEvent

User interactions with pointer devices (mouse, touch, pen).

### KeyboardEvent

Keyboard key press and release events.

### TickEvent

Frame-based update events for animations and continuous operations.

## Common abbreviations

| Abbreviation | Meaning                            |
| ------------ | ---------------------------------- |
| TL           | tldraw (prefix for types)          |
| DO           | Durable Object                     |
| R2           | Cloudflare R2 storage              |
| SSE          | Server-Sent Events                 |
| CRDT         | Conflict-free Replicated Data Type |
| API          | Application Programming Interface  |
| SDK          | Software Development Kit           |
| UI           | User Interface                     |
| E2E          | End-to-End (testing)               |

## Related

- [Architecture overview](../architecture/overview.md) - System design
- [@tldraw/editor](../packages/editor.md) - Core editor
- [@tldraw/store](../packages/store.md) - Store system
