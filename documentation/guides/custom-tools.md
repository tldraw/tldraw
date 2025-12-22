---
title: Custom tools
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - custom
  - tools
  - statenode
  - tutorial
  - guide
---

Tools are state machines built on `StateNode`. This guide shows how to create a custom tool and register it with the editor.

## Prerequisites

- A tldraw app using `@tldraw/tldraw`
- Familiarity with pointer events

## Steps

### 1. Create a tool

```typescript
import { StateNode, createShapeId } from 'tldraw'

class StampTool extends StateNode {
	static override id = 'stamp'

	onPointerDown() {
		const { currentPagePoint } = this.editor.inputs
		this.editor.createShape({
			id: createShapeId(),
			type: 'geo',
			x: currentPagePoint.x - 25,
			y: currentPagePoint.y - 25,
			props: { geo: 'star', w: 50, h: 50 },
		})
	}
}
```

### 2. Register the tool

```tsx
import { Tldraw } from 'tldraw'

function App() {
	return <Tldraw tools={[StampTool]} />
}
```

## Tips

- Use child states when a tool needs multiple phases (idle, dragging, committing).
- Set cursors in `onEnter` and `onExit` for tool-specific feedback.

## Key files

- packages/editor/src/lib/editor/tools/StateNode.ts - Tool state machine base
- packages/tldraw/src/lib/tools/ - Default tool implementations

## Related

- [Tool system](../architecture/tool-system.md)
- [Custom shapes](./custom-shapes.md)
