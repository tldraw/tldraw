---
title: '@tldraw/editor'
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - editor
  - canvas
  - core
  - engine
---

`@tldraw/editor` is the core canvas engine without default shapes, tools, or UI. Use it when you need a fully custom editor built on tldraw's rendering and interaction model.

## Installation

```bash
npm install @tldraw/editor
```

```typescript
import '@tldraw/editor/editor.css'
```

## Basic usage

```tsx
import { TldrawEditor } from '@tldraw/editor'
import '@tldraw/editor/editor.css'

function App() {
	return <TldrawEditor shapeUtils={[]} tools={[]} />
}
```

## Key concepts

- `Editor` class for programmatic control
- `ShapeUtil` for rendering and geometry
- `StateNode` tools for interaction
- Store-backed state via `@tldraw/store`

## Key files

- packages/editor/src/index.ts - Package entry
- packages/editor/src/lib/editor/Editor.ts - Editor class
- packages/editor/src/lib/editor/shapes/ShapeUtil.ts - Shape utilities
- packages/editor/src/lib/editor/tools/StateNode.ts - Tool state machine

## Related

- [@tldraw/tldraw](./tldraw.md)
- [Shape system](../architecture/shape-system.md)
- [Tool system](../architecture/tool-system.md)

## Documentation todos

The following topics should be documented:

- **Instance state** - The `TLInstance` record tracks per-editor state like current page, camera, and UI mode. Instance page state (`TLInstancePageState`) tracks per-page state like selection, hovered shape, and editing shape.
- **Locking** - Shapes can be locked to prevent modification. The `toggleLock()` method changes lock state, and `isShapeOrAncestorLocked()` checks if a shape or its parent is locked.
- **Visibility** - The `getShapeVisibility` option and `isShapeHidden()` method control whether shapes are visible or hidden from rendering and interaction.
- **Snapshots** - The `getSnapshot()` and `loadSnapshot()` methods serialize and restore the entire editor state, useful for persistence and collaboration.
