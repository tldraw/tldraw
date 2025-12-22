---
title: Tool system
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - tools
  - state machines
  - StateNode
  - interactions
  - events
status: published
date: 12/19/2025
order: 8
---

Tools define how users interact with the canvas. Each tool is a hierarchical state machine built on `StateNode`, which receives pointer, keyboard, and wheel events and transitions between child states. The Editor keeps a single active tool and routes input events to it.

## Key components

### StateNode

`StateNode` provides lifecycle hooks, event handlers, and transition logic. Tools can be simple leaf states or branch states with child states for multi-step interactions.

### Root state and tool registration

The root state owns all tools. Tools are registered on the Editor so they can be activated by name, toolbar, or shortcut.

### Inputs

Input state is normalized in `editor.inputs`, which provides pointer position, modifiers, and interaction context to tools.

## Data flow

1. An input event occurs (pointer, keyboard, wheel).
2. The root state routes the event to the active tool.
3. The tool handles the event and may transition to a child state.
4. Lifecycle hooks (`onEnter`, `onExit`) run during transitions.

## Extension points

- Create a custom tool by extending `StateNode`.
- Add child states for multi-stage interactions (press, drag, release).
- Customize cursors and input behavior per state.

```typescript
class MyTool extends StateNode {
	static override id = 'myTool'

	onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	onPointerDown() {
		const { x, y } = this.editor.inputs.getCurrentPagePoint()
		this.editor.createShape({ type: 'geo', x, y })
	}
}
```

## Key files

- packages/editor/src/lib/editor/tools/StateNode.ts - Base state machine
- packages/editor/src/lib/editor/Editor.ts - Tool registration and routing
- packages/tldraw/src/lib/tools/ - Default tool implementations

## Related

- [Shape system](./shape-system.md) - Shapes created and edited by tools
- [UI components](./ui-components.md) - Toolbar and tool UI
