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

## Overview

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
