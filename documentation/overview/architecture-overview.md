---
title: Architecture overview
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - architecture
  - sdk
  - layers
  - design
---

tldraw's SDK is organized as layered packages so you can choose how much of the system to use. The top layer is the full editor, the middle layer is the canvas engine, and the bottom layer is the reactive data system.

## SDK layers

```
@tldraw/tldraw
  Full editor: default shapes, tools, UI

@tldraw/editor
  Canvas engine: rendering, input, tools, shapes

@tldraw/store + @tldraw/state
  Data layer: records, signals, migrations
```

- Use `@tldraw/tldraw` for a complete editor.
- Use `@tldraw/editor` to build a custom editor with your own shapes and tools.
- Use `@tldraw/store` and `@tldraw/state` when you only need the data model or reactivity system.

## Core concepts

### Editor

The `Editor` class coordinates tools, shapes, state, and rendering. Most APIs for creating or updating shapes live here.

### Store and signals

The Store is a record database backed by signals. Signals provide reactive updates and are used for selection, camera state, and derived values.

### Shapes and tools

Shapes are defined by `ShapeUtil` classes. Tools are defined as `StateNode` state machines. This keeps drawing behavior and interaction logic decoupled from the data layer.

## Key files

- packages/tldraw/src/index.ts - Full editor package entry
- packages/editor/src/index.ts - Canvas engine entry
- packages/store/src/index.ts - Store entry
- packages/state/src/index.ts - Signals entry

## Related

- [Repository overview](./repository-overview.md)
- [@tldraw/tldraw](../packages/tldraw.md)
- [@tldraw/editor](../packages/editor.md)
- [Store and records](../architecture/store-records.md)
